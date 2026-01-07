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
  private threadId: string | null = null;
  
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

  async createThread(): Promise<string> {
    const headers = await this.getHeaders();
    const url = `${agentConfig.endpoint}/threads?api-version=${agentConfig.apiVersion}`;
    
    console.log("Creating thread:", url);
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Create thread error:", errorText);
      throw new Error(`Failed to create thread: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    this.threadId = data.id;
    console.log("Thread created:", this.threadId);
    return this.threadId;
  }

  async sendMessage(content: string): Promise<AgentResponse> {
    const headers = await this.getHeaders();
    
    // Create thread if we don't have one
    if (!this.threadId) {
      await this.createThread();
    }

    // Add message to thread
    const messageUrl = `${agentConfig.endpoint}/threads/${this.threadId}/messages?api-version=${agentConfig.apiVersion}`;
    
    console.log("Adding message to thread:", messageUrl);
    
    const messageResponse = await fetch(messageUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        role: "user",
        content: content,
      }),
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error("Add message error:", errorText);
      throw new Error(`Failed to add message: ${messageResponse.status} - ${errorText}`);
    }

    // Create and poll run
    const runUrl = `${agentConfig.endpoint}/threads/${this.threadId}/runs?api-version=${agentConfig.apiVersion}`;
    
    console.log("Creating run:", runUrl);
    
    const runResponse = await fetch(runUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        assistant_id: agentConfig.agentName,
      }),
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error("Create run error:", errorText);
      throw new Error(`Failed to create run: ${runResponse.status} - ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.id;
    console.log("Run created:", runId);

    // Poll for completion
    const result = await this.pollRun(runId);
    
    // Track in conversation history
    this.conversationHistory.push({ role: "user", content });
    this.conversationHistory.push({ role: "assistant", content: result.content });

    return result;
  }

  private async pollRun(runId: string): Promise<AgentResponse> {
    const headers = await this.getHeaders();
    const statusUrl = `${agentConfig.endpoint}/threads/${this.threadId}/runs/${runId}?api-version=${agentConfig.apiVersion}`;
    
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    
    while (attempts < maxAttempts) {
      const response = await fetch(statusUrl, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to poll run: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Run status (attempt ${attempts + 1}):`, data.status);

      if (data.status === "completed") {
        return await this.getLatestMessage(data);
      } else if (data.status === "failed" || data.status === "cancelled" || data.status === "expired") {
        throw new Error(`Run ${data.status}: ${data.last_error?.message || "Unknown error"}`);
      } else if (data.status === "requires_action") {
        // Handle tool calls if needed (for function calling patterns)
        console.log("Run requires action - tool outputs needed");
        // For now, we let the agent handle its own tools
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error("Run timed out");
  }

  private async getLatestMessage(runData: { id: string }): Promise<AgentResponse> {
    const headers = await this.getHeaders();
    const messagesUrl = `${agentConfig.endpoint}/threads/${this.threadId}/messages?api-version=${agentConfig.apiVersion}&limit=1&order=desc`;
    
    const response = await fetch(messagesUrl, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get messages: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const latestMessage = data.data?.[0];
    
    if (!latestMessage) {
      throw new Error("No messages found");
    }

    // Extract content
    let content = "No response";
    if (latestMessage.content?.[0]?.text?.value) {
      content = latestMessage.content[0].text.value;
    }

    // Detect sources from annotations
    const sources: string[] = [];
    const annotations = latestMessage.content?.[0]?.text?.annotations || [];
    
    for (const annotation of annotations) {
      if (annotation.type === "file_citation") {
        sources.push("MovieLabs OMC");
      }
    }

    // Check run steps for tool usage
    const toolCalls = await this.getToolCalls(runData.id);

    return {
      id: latestMessage.id || `msg-${Date.now()}`,
      content,
      sources: [...new Set(sources)], // Deduplicate
      toolCalls,
      createdAt: Date.now(),
    };
  }

  private async getToolCalls(runId: string): Promise<ToolCall[]> {
    try {
      const headers = await this.getHeaders();
      const stepsUrl = `${agentConfig.endpoint}/threads/${this.threadId}/runs/${runId}/steps?api-version=${agentConfig.apiVersion}`;
      
      const response = await fetch(stepsUrl, { headers });
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const toolCalls: ToolCall[] = [];

      for (const step of data.data || []) {
        if (step.type === "tool_calls") {
          for (const tc of step.step_details?.tool_calls || []) {
            toolCalls.push({
              type: tc.type,
              name: tc.function?.name || tc.file_search?.name || tc.type,
              result: tc.function?.output || tc.file_search?.results,
            });
          }
        }
      }

      return toolCalls;
    } catch (error) {
      console.error("Error getting tool calls:", error);
      return [];
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.threadId = null;
  }

  getHistory(): Message[] {
    return [...this.conversationHistory];
  }
}
