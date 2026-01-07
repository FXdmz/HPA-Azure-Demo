import { agentConfig } from "@/config/auth";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentResponse {
  id: string;
  content: string;
  sources: string[];
  toolCalls?: ToolCall[];
  createdAt: number;
}

interface ToolCall {
  type: string;
  name: string;
  result?: unknown;
}

export class AgentService {
  private getAccessToken: () => Promise<string>;
  private conversationHistory: Message[] = [];
  
  constructor(getAccessToken: () => Promise<string>) {
    this.getAccessToken = getAccessToken;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async initialize(): Promise<{ agentId: string; status: string }> {
    // Verify we can get a token
    await this.getAccessToken();
    return { agentId: agentConfig.agentName, status: "ready" };
  }

  async sendMessage(content: string): Promise<AgentResponse> {
    const headers = await this.getHeaders();
    
    // Add user message to history
    this.conversationHistory.push({ role: "user", content });
    
    // Build messages array from conversation history
    const messages = this.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Use the OpenAI-compatible responses endpoint with agent reference
    const url = `${agentConfig.endpoint}/openai/responses?api-version=${agentConfig.apiVersion}`;
    
    console.log("Sending message via Responses API:", url);
    console.log("Agent name:", agentConfig.agentName);
    
    const requestBody = {
      input: messages,
      agent: {
        name: agentConfig.agentName,
        type: "agent_reference",
      },
    };
    
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Responses API error:", errorText);
      // Remove the failed message from history
      this.conversationHistory.pop();
      throw new Error(`Failed to get response: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));

    // Extract the response content
    let responseContent = "No response";
    const sources: string[] = [];
    const toolCalls: ToolCall[] = [];

    // Handle the response format
    if (data.output_text) {
      responseContent = data.output_text;
    } else if (data.output) {
      // Handle array of output items
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          for (const contentItem of item.content) {
            if (contentItem.type === "text") {
              responseContent = contentItem.text;
            }
            // Check for annotations/citations
            if (contentItem.annotations) {
              for (const annotation of contentItem.annotations) {
                if (annotation.type === "file_citation") {
                  sources.push("MovieLabs OMC");
                }
              }
            }
          }
        }
        // Track tool usage
        if (item.type === "function_call" || item.type === "tool_use") {
          toolCalls.push({
            type: item.type,
            name: item.name || item.function?.name || "unknown",
            result: item.output || item.result,
          });
          // Check for ME-NEXUS tool
          if (item.name === "getfactcard" || item.function?.name === "getfactcard") {
            sources.push("ME-NEXUS");
          }
        }
        if (item.type === "file_search_call") {
          sources.push("MovieLabs OMC");
          toolCalls.push({
            type: "file_search",
            name: "file_search",
            result: item.results,
          });
        }
      }
    } else if (data.choices?.[0]?.message?.content) {
      // Fallback to chat completions format
      responseContent = data.choices[0].message.content;
    }

    // Add assistant response to history
    this.conversationHistory.push({ role: "assistant", content: responseContent });

    return {
      id: data.id || `msg-${Date.now()}`,
      content: responseContent,
      sources: [...new Set(sources)], // Deduplicate
      toolCalls,
      createdAt: Date.now(),
    };
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): Message[] {
    return [...this.conversationHistory];
  }
}
