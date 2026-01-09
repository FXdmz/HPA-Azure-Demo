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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agent: semanticAgentName, mode: 'dynamic-resolution' });
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
    let run = await projectClient.agents.runs.create(threadId, agentId);
    console.log(`[Execution] Run created: ${run.id}, status: ${run.status}`);
    
    while (run.status === "queued" || run.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await projectClient.agents.runs.get(threadId, run.id);
      console.log(`[Execution] Run status: ${run.status}`);
    }
    
    if (run.status !== "completed") {
      throw new Error(`Run failed: ${run.status}`);
    }

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

    if (lastMessage) {
      console.log(`[Messages] Processing assistant message: ${lastMessage.id}`);
      if (lastMessage.content && Array.isArray(lastMessage.content)) {
        for (const item of lastMessage.content) {
          if (item.type === "text") {
            content += item.text?.value || "";
            if (item.text?.annotations?.length > 0) {
              sources.push("Source Citation");
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
      threadId: threadId
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
