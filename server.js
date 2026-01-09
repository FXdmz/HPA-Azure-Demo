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

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);

const connectionString = process.env.AI_FOUNDRY_ENDPOINT;
const agentId = process.env.AI_AGENT_NAME;

const projectClient = new AIProjectClient(connectionString, credential);

const sessions = new Map();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agent: agentId });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });

    let threadId = sessions.get(sessionId);
    if (!threadId) {
      console.log("Creating new thread...");
      const thread = await projectClient.agents.createThread();
      threadId = thread.id;
      sessions.set(sessionId, threadId);
    }

    console.log(`Adding message to thread ${threadId}...`);
    await projectClient.agents.createMessage(threadId, {
      role: "user",
      content: message,
    });

    console.log(`Starting run with agent ${agentId}...`);
    let run = await projectClient.agents.createRun(threadId, agentId);

    while (run.status === "queued" || run.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await projectClient.agents.getRun(threadId, run.id);
    }

    if (run.status !== "completed") {
      throw new Error(`Run failed with status: ${run.status}`);
    }

    const messages = await projectClient.agents.listMessages(threadId);
    const lastMessage = messages.data[0]; 

    let content = "";
    const sources = [];

    if (lastMessage.role === "assistant") {
      for (const item of lastMessage.content) {
        if (item.type === "text") {
          content += item.text.value;
          if (item.text.annotations && item.text.annotations.length > 0) {
             sources.push("MovieLabs OMC"); 
          }
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
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clear', (req, res) => {
  const { sessionId = 'default' } = req.body;
  sessions.delete(sessionId);
  res.json({ status: 'cleared' });
});

app.use(express.static(join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Foundry Endpoint: ${connectionString}`);
  console.log(`Agent ID: ${agentId}`);
});
