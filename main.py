import os
import time
import json
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from azure.identity import ClientSecretCredential
from azure.ai.projects import AIProjectClient

app = FastAPI()

CONNECTION_STRING = os.environ.get("AI_FOUNDRY_ENDPOINT")
AGENT_NAME = os.environ.get("AI_AGENT_NAME")

if not CONNECTION_STRING or not AGENT_NAME:
    print("MISSING SECRETS: Check AI_FOUNDRY_ENDPOINT and AI_AGENT_NAME")

credential = ClientSecretCredential(
    tenant_id=os.environ.get("AZURE_TENANT_ID"),
    client_id=os.environ.get("AZURE_CLIENT_ID"),
    client_secret=os.environ.get("AZURE_CLIENT_SECRET")
)

project_client = AIProjectClient(
    endpoint=CONNECTION_STRING,
    credential=credential
)

cached_agent_id = None
sessions = {}

async def execute_fact_card_tool(name: str) -> str:
    print(f"[Tool] Calling Azure Function for: '{name}'...")
    url = f"https://aescher-func-a8gdetcud6g8a5b6.canadacentral-01.azurewebsites.net/api/getfactcard?name={name}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            if response.status_code != 200:
                return json.dumps({"error": f"Azure Function returned {response.status_code}"})
            data = response.json()
            print(f"[Tool] Azure Function returned {len(data) if isinstance(data, list) else 0} records.")
            return json.dumps(data)
    except Exception as e:
        print(f"[Tool] Failed to call Azure Function: {e}")
        return json.dumps({"error": "Connection to Truth Engine failed."})

def get_agent_id_by_name(name: str):
    global cached_agent_id
    if cached_agent_id:
        return cached_agent_id

    print(f"[Registry] Finding agent: '{name}'...")
    agents = project_client.agents.list_agents()
    
    found_agent = next((a for a in agents if a.name == name), None)
    
    if not found_agent:
        raise Exception(f"Agent '{name}' not found in project.")
        
    print(f"[Registry] Found ID: {found_agent.id}")
    cached_agent_id = found_agent.id
    return found_agent.id

def get_agent_details():
    agents = project_client.agents.list_agents()
    agent = next((a for a in agents if a.name == AGENT_NAME or a.id == AGENT_NAME), None)
    if not agent:
        raise Exception(f"Agent '{AGENT_NAME}' not found.")
    return agent

@app.get("/api/agents")
async def list_all_agents():
    try:
        agents = project_client.agents.list_agents()
        result = []
        for agent in agents:
            tools = []
            if agent.tools:
                for t in agent.tools:
                    if t.type == "function" and hasattr(t, 'function'):
                        tools.append(f"fn:{t.function.name}")
                    else:
                        tools.append(t.type)
            result.append({
                "name": agent.name,
                "id": agent.id,
                "model": agent.model,
                "createdAt": agent.created_at.isoformat() if agent.created_at else None,
                "tools": tools
            })
        return {"agents": result}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/health")
async def health():
    current_endpoint = os.environ.get("AI_FOUNDRY_ENDPOINT") or CONNECTION_STRING or "Unknown"
    try:
        agent = get_agent_details()
        return {
            "status": "ok",
            "agentName": agent.name,
            "agentId": agent.id,
            "projectName": current_endpoint,
            "sdkVersion": "python-azure-ai-projects",
            "mode": "dynamic-resolution"
        }
    except Exception:
        return {
            "status": "ok",
            "agentName": AGENT_NAME,
            "agentId": cached_agent_id or AGENT_NAME,
            "projectName": current_endpoint,
            "sdkVersion": "python-azure-ai-projects",
            "mode": "dynamic-resolution"
        }

@app.get("/api/agent")
async def get_agent():
    try:
        agent = get_agent_details()
        tools = []
        if agent.tools:
            for t in agent.tools:
                if t.type == "function" and hasattr(t, 'function'):
                    tools.append(f"fn:{t.function.name}")
                else:
                    tools.append(t.type)
        
        return {
            "name": agent.name,
            "id": agent.id,
            "model": agent.model,
            "instructions": agent.instructions,
            "tools": tools,
            "vectorStoreIds": agent.tool_resources.file_search.vector_store_ids if agent.tool_resources and agent.tool_resources.file_search else [],
            "createdAt": agent.created_at.isoformat() if agent.created_at else None
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/chat")
async def chat(request: Request):
    global cached_agent_id
    try:
        body = await request.json()
        message_content = body.get("message")
        session_id = body.get("sessionId", "default")
        requested_agent_id = body.get("agentId")

        if not message_content:
            raise HTTPException(status_code=400, detail="Message is required")

        if requested_agent_id:
            agent_id = requested_agent_id
            print(f"[Chat] Using requested agent: {agent_id}")
        else:
            agent_id = get_agent_id_by_name(AGENT_NAME or "")

        thread_id = sessions.get(session_id)
        if not thread_id:
            print(f"[Thread] Creating new thread for session: {session_id}")
            thread = project_client.agents.create_thread()
            thread_id = thread.id
            sessions[session_id] = thread_id
            print(f"[Thread] Created: {thread_id}")

        print(f"[Message] Adding user message to thread {thread_id}")
        project_client.agents.create_message(
            thread_id=thread_id,
            role="user",
            content=message_content
        )

        print(f"[Execution] Starting run for agent {agent_id}...")
        run_start_time = time.time()
        run = project_client.agents.create_run(thread_id=thread_id, assistant_id=agent_id)
        print(f"[Execution] Run created: {run.id}, status: {run.status}")

        while run.status in ["queued", "in_progress", "requires_action"]:
            time.sleep(1)
            run = project_client.agents.get_run(thread_id=thread_id, run_id=run.id)
            print(f"[Execution] Run status: {run.status}")

            if run.status == "requires_action":
                print("[Tool] Agent is requesting tool execution...")
                tool_outputs = []
                
                if run.required_action and run.required_action.submit_tool_outputs:
                    tool_calls = run.required_action.submit_tool_outputs.tool_calls
                    
                    for tool_call in tool_calls:
                        func_name = tool_call.function.name if tool_call.function else None
                        print(f"[Tool] Processing tool call: {func_name}")
                        
                        if func_name == "getFactCard":
                            args = json.loads(tool_call.function.arguments)
                            output = await execute_fact_card_tool(args.get("name", ""))
                            tool_outputs.append({
                                "tool_call_id": tool_call.id,
                                "output": output
                            })

                if tool_outputs:
                    print("[Tool] Submitting tool outputs back to agent...")
                    project_client.agents.submit_tool_outputs_to_run(
                        thread_id=thread_id,
                        run_id=run.id,
                        tool_outputs=tool_outputs
                    )

        safety_status = "passed"
        failure_reason = None

        if run.status == "failed":
            if run.last_error and run.last_error.code == "content_filter":
                safety_status = "blocked"
                failure_reason = "Content Filter Triggered"
                return {
                    "id": f"blocked-{int(time.time())}",
                    "content": "The response was blocked by safety filters.",
                    "role": "assistant",
                    "sources": [],
                    "meta": {"safety": {"status": "blocked", "violation": failure_reason}}
                }
            else:
                error_msg = run.last_error.message if run.last_error else run.status
                raise Exception(f"Run failed: {error_msg}")

        if run.status == "incomplete":
            if run.incomplete_details and run.incomplete_details.reason == "content_filter":
                safety_status = "truncated"
                failure_reason = "Response truncated due to safety violation"

        if run.status not in ["completed", "incomplete"]:
            raise Exception(f"Run failed: {run.status}")

        tools_used = False
        tool_names = []
        try:
            steps = project_client.agents.list_run_steps(thread_id=thread_id, run_id=run.id)
            for step in steps:
                if step.type == "tool_calls":
                    tools_used = True
                    if step.step_details and hasattr(step.step_details, 'tool_calls'):
                        for tc in step.step_details.tool_calls:
                            if hasattr(tc, 'function') and tc.function:
                                tool_names.append(tc.function.name)
                            else:
                                tool_names.append(tc.type)
        except Exception as e:
            print(f"[Steps] Could not fetch run steps: {e}")

        duration_ms = int((time.time() - run_start_time) * 1000)

        print(f"[Messages] Fetching messages from thread {thread_id}")
        messages = list(project_client.agents.list_messages(thread_id=thread_id))
        print(f"[Messages] Found {len(messages)} messages")

        last_message = next((m for m in messages if m.role == "assistant"), None)

        content = ""
        sources = []
        citations = []

        if last_message:
            print(f"[Messages] Processing assistant message: {last_message.id}")
            for item in last_message.content:
                if hasattr(item, 'text') and item.text:
                    content += item.text.value or ""
                    if item.text.annotations:
                        sources.append("Source Citation")
                        for ann in item.text.annotations:
                            if hasattr(ann, 'file_citation'):
                                citations.append(ann.file_citation)

        tokens = None
        if run.usage:
            tokens = {
                "total": run.usage.total_tokens or 0,
                "prompt": run.usage.prompt_tokens or 0,
                "completion": run.usage.completion_tokens or 0
            }

        print(f"[Response] Sending {len(content)} chars to client")
        return {
            "id": last_message.id if last_message else None,
            "content": content,
            "sources": list(set(sources)),
            "threadId": thread_id,
            "meta": {
                "duration_ms": duration_ms,
                "tokens": tokens,
                "tool_used": tools_used,
                "tool_names": list(set(tool_names)),
                "model": run.model,
                "safety": {
                    "status": safety_status,
                    "violation": failure_reason
                },
                "citations": [c for c in citations if c]
            }
        }

    except Exception as e:
        print(f"[Error] {e}")
        cached_agent_id = None
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/clear")
async def clear_session(request: Request):
    body = await request.json()
    session_id = body.get("sessionId", "default")
    if session_id in sessions:
        del sessions[session_id]
    return {"status": "cleared"}

app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    print(f"""
  AZURE AI AGENT SERVICE (Python FastAPI)
  -----------------------------------
  Project:  {CONNECTION_STRING}
  Agent:    {AGENT_NAME} (Name-Based)
  Status:   Ready
  -----------------------------------
  """)
    uvicorn.run(app, host="0.0.0.0", port=3001)
