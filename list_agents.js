import { ClientSecretCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';

const connectionString = process.env.AI_FOUNDRY_ENDPOINT;
const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);

const projectClient = new AIProjectClient(connectionString, credential);

async function main() {
  console.log("\n🔎 SCANNING FOR AGENTS...");
  try {
    const agents = [];
    for await (const agent of projectClient.agents.listAgents()) {
      agents.push(agent);
    }
    
    if (agents.length === 0) {
      console.log("❌ No agents found in this project.");
    } else {
      console.log("✅ FOUND THESE AGENTS:");
      console.log("-----------------------------------");
      agents.forEach(agent => {
        console.log(`NAME: "${agent.name}"  <--- COPY THIS EXACTLY`);
        console.log(`ID:   ${agent.id}`);
        console.log("-----------------------------------");
      });
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
