import express from 'express';
import cors from 'cors';
import { ClientSecretCredential } from '@azure/identity';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);

const ENDPOINT = process.env.AI_FOUNDRY_ENDPOINT;
const AGENT_NAME = process.env.AI_AGENT_NAME;
const API_VERSION = "2024-12-01-preview";

const sessions = new Map();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agent: AGENT_NAME });
});

async function getAccessToken() {
  const tokenResponse = await credential.getToken("https://cognitiveservices.azure.com/.default");
  return tokenResponse.token;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const token = await getAccessToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    let threadId = sessions.get(sessionId);
    let runData;

    if (!threadId) {
      console.log('Creating new thread and run...');
      const response = await fetch(
        `${ENDPOINT}/threads/runs?api-version=${API_VERSION}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            assistant_id: AGENT_NAME,
            thread: {
              messages: [{ role: 'user', content: message }]
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Create thread/run error:', error);
        throw new Error(`Failed to create thread: ${error}`);
      }

      runData = await response.json();
      threadId = runData.thread_id;
      sessions.set(sessionId, threadId);
      console.log('Thread created:', threadId);
    } else {
      console.log('Adding message to thread:', threadId);
      
      const msgResponse = await fetch(
        `${ENDPOINT}/threads/${threadId}/messages?api-version=${API_VERSION}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ role: 'user', content: message })
        }
      );

      if (!msgResponse.ok) {
        const error = await msgResponse.text();
        console.error('Add message error:', error);
        throw new Error(`Failed to add message: ${error}`);
      }

      const runResponse = await fetch(
        `${ENDPOINT}/threads/${threadId}/runs?api-version=${API_VERSION}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ assistant_id: AGENT_NAME })
        }
      );

      if (!runResponse.ok) {
        const error = await runResponse.text();
        console.error('Create run error:', error);
        throw new Error(`Failed to create run: ${error}`);
      }

      runData = await runResponse.json();
    }

    console.log('Polling run:', runData.id);
    let status = runData.status;
    let attempts = 0;
    const maxAttempts = 60;

    while ((status === 'queued' || status === 'in_progress') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `${ENDPOINT}/threads/${threadId}/runs/${runData.id}?api-version=${API_VERSION}`,
        { headers }
      );
      
      const statusData = await statusResponse.json();
      status = statusData.status;
      console.log(`Run status (${attempts + 1}):`, status);
      attempts++;
    }

    if (status !== 'completed') {
      throw new Error(`Run ended with status: ${status}`);
    }

    const messagesResponse = await fetch(
      `${ENDPOINT}/threads/${threadId}/messages?api-version=${API_VERSION}&order=desc&limit=1`,
      { headers }
    );

    const messagesData = await messagesResponse.json();
    const assistantMessage = messagesData.data?.[0];

    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    let content = '';
    const sources = [];

    for (const item of assistantMessage.content || []) {
      if (item.type === 'text') {
        content = item.text?.value || '';
        
        for (const annotation of item.text?.annotations || []) {
          if (annotation.type === 'file_citation') {
            sources.push('MovieLabs OMC');
          }
        }
      }
    }

    res.json({
      id: assistantMessage.id,
      content,
      sources: [...new Set(sources)],
      threadId
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Agent: ${AGENT_NAME}`);
  console.log(`Endpoint: ${ENDPOINT}`);
});
