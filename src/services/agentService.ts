interface AgentResponse {
  id: string;
  content: string;
  sources: string[];
  threadId?: string;
}

export class AgentService {
  private sessionId: string;

  constructor() {
    this.sessionId = `session-${Date.now()}`;
  }

  async initialize(): Promise<{ agentId: string; status: string }> {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      return { agentId: data.agent, status: 'ready' };
    } catch (error) {
      console.error('Health check failed:', error);
      return { agentId: 'unknown', status: 'error' };
    }
  }

  async sendMessage(content: string): Promise<AgentResponse> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        sessionId: this.sessionId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get response');
    }

    return response.json();
  }

  clearHistory(): void {
    fetch('/api/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId })
    });
    this.sessionId = `session-${Date.now()}`;
  }

  getHistory(): Array<{ role: string; content: string }> {
    return [];
  }
}
