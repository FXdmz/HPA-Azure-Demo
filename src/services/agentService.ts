interface AgentResponse {
  id: string;
  content: string;
  sources: string[];
  threadId?: string;
}

export class AgentService {
  private backendUrl: string;
  private sessionId: string;

  constructor() {
    this.backendUrl = window.location.origin.replace(':5000', ':3001');
    if (!this.backendUrl.includes('localhost') && !this.backendUrl.includes(':3001')) {
      this.backendUrl = '';
    }
    this.sessionId = `session-${Date.now()}`;
  }

  async initialize(): Promise<{ agentId: string; status: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/health`);
      const data = await response.json();
      return { agentId: data.agent, status: 'ready' };
    } catch (error) {
      console.error('Backend health check failed:', error);
      return { agentId: 'unknown', status: 'error' };
    }
  }

  async sendMessage(content: string): Promise<AgentResponse> {
    const response = await fetch(`${this.backendUrl}/api/chat`, {
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
    fetch(`${this.backendUrl}/api/clear`, {
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
