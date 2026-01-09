import { ClientSecretCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';

const connectionString = process.env.AI_FOUNDRY_ENDPOINT;
const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);

const projectClient = new AIProjectClient(connectionString, credential);

async function listAgents() {
  console.log("\n🔍 Connecting to Azure Foundry to find your agents...\n");
  try {
    const agents = [];
    for await (const agent of projectClient.agents.listAgents()) {
      agents.push(agent);
    }
    
    console.log("------------------------------------------------");
    console.log("  AVAILABLE AGENTS");
    console.log("------------------------------------------------");
    
    if (agents.length === 0) {
      console.log("No agents found in this project.");
    } else {
      agents.forEach(agent => {
        console.log(`Name:  ${agent.name}`);
        console.log(`ID:    ${agent.id}  <-- COPY THIS`);
        console.log("------------------------------------------------");
      });
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

listAgents();
