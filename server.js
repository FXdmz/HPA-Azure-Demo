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

// --- 1. NEW WAY CONFIGURATION ---
// We connect to the PROJECT (Management Plane), not the Resource
const connectionString = process.env.AI_FOUNDRY_ENDPOINT; 
const semanticAgentName = process.env.AI_AGENT_NAME; // "aescher2"

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);

// Initialize the Project Client (The Control Plane)
const projectClient = new AIProjectClient(connectionString, credential);

const sessions = new Map();
let cachedAgentId = null;

// --- 2. THE REGISTRY PATTERN (Resolve Name -> ID) ---
// As described in "Architectural Evolution": This resolves the semantic name 
// to the runtime ID dynamically.
async function resolveAgentId(name) {
  // If already an ID, use directly
  if (name && name.startsWith('asst_')) {
    cachedAgentId = name;
    return name;
  }
  
  if (cachedAgentId) return cachedAgentId;

  console.log(`[Registry] Resolving semantic name "${name}"...`);
  
  // Fetch all agents in the Project Scope
  const agents = [];
  for await (const agent of projectClient.agents.listAgents()) {
    agents.push(agent);
  }
  
  // Match by Name (Semantic Identity)
  const agent = agents.find(a => a.name === name);

  if (!agent) {
    throw new Error(`Agent "${name}" not found in Project. Available agents: ${agents.map(a => a.name).join(", ")}`);
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

    // A. RESOLVE IDENTITY
    // We do not use hardcoded IDs. We resolve at runtime.
    const agentId = await resolveAgentId(semanticAgentName);

    // B. MANAGE STATE (Thread)
    let threadId = sessions.get(sessionId);
    if (!threadId) {
      const thread = await projectClient.agents.createThread();
      threadId = thread.id;
      sessions.set(sessionId, threadId);
    }

    // C. ADD MESSAGE
    await projectClient.agents.createMessage(threadId, {
      role: "user",
      content: message,
    });

    // D. EXECUTE RUN
    console.log(`[Execution] Starting run for "${semanticAgentName}"...`);
    let run = await projectClient.agents.createRun(threadId, agentId);
    
    // Poll for completion
    while (run.status === "queued" || run.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await projectClient.agents.getRun(threadId, run.id);
    }
    
    if (run.status !== "completed") {
      throw new Error(`Run failed: ${run.status}`);
    }

    // E. RETRIEVE CONTENT
    const messages = await projectClient.agents.listMessages(threadId);
    const lastMessage = messages.data[0]; 
    
    let content = "";
    const sources = [];

    if (lastMessage.role === "assistant") {
      for (const item of lastMessage.content) {
        if (item.type === "text") {
          content += item.text.value;
          if (item.text.annotations?.length > 0) sources.push("Source Citation");
        }
      }
    }

    res.json({
      id: lastMessage.id,
      content: content,
      sources: [...new Set(sources)],
      threadId: threadId
    });

  } catch (error) {
    console.error("[Error]", error.message);
    cachedAgentId = null; // Clear cache on error
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clear', (req, res) => {
  const { sessionId = 'default' } = req.body;
  sessions.delete(sessionId);
  res.json({ status: 'cleared' });
});

// Serve frontend
app.use(express.static(join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  AZURE AI AGENT SERVICE (NEW WAY)
  -----------------------------------
  Project:  ${connectionString}
  Agent:    ${semanticAgentName} (Name-Based)
  Status:   Ready
  -----------------------------------
  `);
});
