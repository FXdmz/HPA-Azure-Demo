import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ClientSecretCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- CONFIGURATION ---
const connectionString = process.env.AI_FOUNDRY_ENDPOINT; 
const semanticAgentName = process.env.AI_AGENT_NAME;

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);

const projectClient = new AIProjectClient(connectionString, credential);

const sessions = new Map();
let cachedAgentId = null;

// --- TOOL EXECUTOR: Call Azure Function for getFactCard ---
async function executeFactCardTool(name) {
  console.log(`[Tool] Calling Azure Function for: "${name}"...`);
  
  const url = `https://aescher-func-a8gdetcud6g8a5b6.canadacentral-01.azurewebsites.net/api/getfactcard?name=${encodeURIComponent(name)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return JSON.stringify({ error: `Azure Function returned ${response.status}` });
    }
    const data = await response.json();
    console.log(`[Tool] Azure Function returned ${data.length || 0} records.`);
    return JSON.stringify(data);
  } catch (error) {
    console.error("[Tool] Failed to call Azure Function:", error.message);
    return JSON.stringify({ error: "Connection to Truth Engine failed." });
  }
}

// --- REGISTRY PATTERN (Resolve Name -> ID) ---
async function resolveAgentId(name) {
  if (name && name.startsWith('asst_')) {
    cachedAgentId = name;
    return name;
  }
  
  if (cachedAgentId) return cachedAgentId;

  console.log(`[Registry] Resolving semantic name "${name}"...`);
  
  const agents = [];
  for await (const agent of projectClient.agents.listAgents()) {
    agents.push(agent);
  }
  
  const agent = agents.find(a => a.name === name);

  if (!agent) {
    throw new Error(`Agent "${name}" not found. Available: ${agents.map(a => a.name).join(", ")}`);
  }

  console.log(`[Registry] Resolved "${name}" -> ${agent.id}`);
  cachedAgentId = agent.id;
  return agent.id;
}

// Helper: Get full agent object
async function getAgentDetails() {
  const agents = [];
  for await (const agent of projectClient.agents.listAgents()) {
    agents.push(agent);
  }
  const agent = agents.find(a => a.name === semanticAgentName || a.id === semanticAgentName);
  if (!agent) throw new Error(`Agent "${semanticAgentName}" not found.`);
  return agent;
}

app.get('/api/health', async (req, res) => {
  try {
    const agent = await getAgentDetails();
    cachedAgentId = agent.id;
    
    res.json({ 
      status: 'ok', 
      agentName: agent.name,
      agentId: agent.id,
      mode: 'dynamic-resolution' 
    });
  } catch (error) {
    res.json({ 
      status: 'ok', 
      agentName: semanticAgentName,
      agentId: cachedAgentId || semanticAgentName,
      mode: 'dynamic-resolution' 
    });
  }
});

app.get('/api/agent', async (req, res) => {
  try {
    const agent = await getAgentDetails();
    cachedAgentId = agent.id;
    
    res.json({
      name: agent.name,
      id: agent.id,
      model: agent.model,
      instructions: agent.instructions,
      tools: agent.tools ? agent.tools.map(t => t.type === 'function' ? `fn:${t.function?.name}` : t.type) : [],
      vectorStoreIds: agent.toolResources?.fileSearch?.vectorStoreIds || [],
      createdAt: agent.createdAt ? new Date(agent.createdAt).toISOString() : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    const agentId = await resolveAgentId(semanticAgentName);

    let threadId = sessions.get(sessionId);
    if (!threadId) {
      console.log(`[Thread] Creating new thread for session: ${sessionId}`);
      const thread = await projectClient.agents.threads.create();
      threadId = thread.id;
      sessions.set(sessionId, threadId);
      console.log(`[Thread] Created thread: ${threadId}`);
    }

    console.log(`[Message] Adding user message to thread ${threadId}`);
    // Correct signature: create(threadId, role, content)
    await projectClient.agents.messages.create(threadId, "user", message);

    console.log(`[Execution] Starting run for agent ${agentId}...`);
    const runStartTime = Date.now();
    let run = await projectClient.agents.runs.create(threadId, agentId);
    console.log(`[Execution] Run created: ${run.id}, status: ${run.status}`);
    
    while (['queued', 'in_progress', 'requires_action'].includes(run.status)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await projectClient.agents.runs.get(threadId, run.id);
      console.log(`[Execution] Run status: ${run.status}`);
      
      // Handle tool calls
      if (run.status === "requires_action") {
        console.log("[Tool] Agent is requesting tool execution...");
        const toolOutputs = [];
        const toolCalls = run.requiredAction?.submitToolOutputs?.toolCalls || 
                          run.required_action?.submit_tool_outputs?.tool_calls || [];

        for (const toolCall of toolCalls) {
          const funcName = toolCall.function?.name;
          console.log(`[Tool] Processing tool call: ${funcName}`);
          
          if (funcName === "getFactCard") {
            const args = JSON.parse(toolCall.function.arguments);
            const output = await executeFactCardTool(args.name);
            toolOutputs.push({
              toolCallId: toolCall.id,
              output: output
            });
          }
        }

        if (toolOutputs.length > 0) {
          console.log("[Tool] Submitting tool outputs back to agent...");
          await projectClient.agents.runs.submitToolOutputs(threadId, run.id, toolOutputs);
        }
      }
    }

    // --- HANDLE SAFETY FAILURES ---
    let safetyStatus = "passed";
    let failureReason = null;

    if (run.status === "failed") {
      if (run.lastError?.code === "content_filter") {
        safetyStatus = "blocked";
        failureReason = "Content Filter Triggered";
        return res.json({
          id: `blocked-${Date.now()}`,
          content: "The response was blocked by safety filters.",
          role: "assistant",
          sources: [],
          meta: { safety: { status: "blocked", violation: failureReason } }
        });
      } else {
        throw new Error(`Run failed: ${run.lastError?.message || run.status}`);
      }
    }

    if (run.status === "incomplete" && run.incompleteDetails?.reason === "content_filter") {
      safetyStatus = "truncated";
      failureReason = "Response truncated due to safety violation";
    }

    if (run.status !== "completed" && run.status !== "incomplete") {
      throw new Error(`Run failed: ${run.status}`);
    }

    // --- FETCH RUN STEPS (for tool usage) ---
    const steps = [];
    try {
      for await (const step of projectClient.agents.runs.steps.list(threadId, run.id)) {
        steps.push(step);
      }
    } catch (stepErr) {
      console.log('[Steps] Could not fetch run steps:', stepErr.message);
    }

    const toolsUsed = steps.some(s => s.type === 'tool_calls');
    const toolNames = steps
      .filter(s => s.type === 'tool_calls')
      .flatMap(s => {
        const calls = s.stepDetails?.toolCalls || s.step_details?.tool_calls || [];
        return calls.map(tc => tc.function?.name || tc.type || 'unknown');
      });

    // --- TIMING ---
    const durationMs = Date.now() - runStartTime;

    console.log(`[Messages] Fetching messages from thread ${threadId}`);
    const allMessages = [];
    for await (const msg of projectClient.agents.messages.list(threadId)) {
      allMessages.push(msg);
    }
    console.log(`[Messages] Found ${allMessages.length} messages`);
    
    // Find the latest assistant message
    const lastMessage = allMessages.find(m => m.role === "assistant");
    
    let content = "";
    const sources = [];
    const citations = [];

    if (lastMessage) {
      console.log(`[Messages] Processing assistant message: ${lastMessage.id}`);
      if (lastMessage.content && Array.isArray(lastMessage.content)) {
        for (const item of lastMessage.content) {
          if (item.type === "text") {
            content += item.text?.value || "";
            const annotations = item.text?.annotations || [];
            if (annotations.length > 0) {
              sources.push("Source Citation");
              citations.push(...annotations.map(a => a.fileCitation || a.file_citation || a.filePath || a.file_path));
            }
          }
        }
      }
    }

    console.log(`[Response] Sending ${content.length} chars to client`);
    res.json({
      id: lastMessage?.id,
      content: content,
      sources: [...new Set(sources)],
      threadId: threadId,
      meta: {
        duration_ms: durationMs,
        tokens: run.usage ? {
          total: run.usage.totalTokens || run.usage.total_tokens || 0,
          prompt: run.usage.promptTokens || run.usage.prompt_tokens || 0,
          completion: run.usage.completionTokens || run.usage.completion_tokens || 0
        } : null,
        tool_used: toolsUsed,
        tool_names: [...new Set(toolNames)],
        model: run.model,
        safety: {
          status: safetyStatus,
          violation: failureReason
        },
        citations: citations.filter(c => c)
      }
    });

  } catch (error) {
    console.error("[Error]", error);
    cachedAgentId = null;
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clear', (req, res) => {
  const { sessionId = 'default' } = req.body;
  sessions.delete(sessionId);
  res.json({ status: 'cleared' });
});

app.use(express.static(join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  AZURE AI AGENT SERVICE
  -----------------------------------
  Project:  ${connectionString}
  Agent:    ${semanticAgentName} (Name-Based)
  Status:   Ready
  -----------------------------------
  `);
});
