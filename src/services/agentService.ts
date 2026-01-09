interface AgentResponse {
  id: string;
  content: string;
  sources: string[];
  threadId?: string;
}

interface AgentInfo {
  agentName: string;
  agentId: string;
  status: string;
}

export class AgentService {
  private sessionId: string;
  private agentInfo: AgentInfo | null = null;

  constructor() {
    this.sessionId = `session-${Date.now()}`;
    console.log('[AgentService] Initialized with session:', this.sessionId);
  }

  async initialize(): Promise<AgentInfo> {
    console.log('[AgentService] Checking health...');
    try {
      const response = await fetch('/api/health');
      console.log('[AgentService] Health response status:', response.status);
      const data = await response.json();
      console.log('[AgentService] Health data:', data);
      
      this.agentInfo = {
        agentName: data.agentName || 'Unknown',
        agentId: data.agentId || 'Unknown',
        status: 'ready'
      };
      
      return this.agentInfo;
    } catch (error) {
      console.error('[AgentService] Health check failed:', error);
      this.agentInfo = { agentName: 'unknown', agentId: 'unknown', status: 'error' };
      return this.agentInfo;
    }
  }

  getAgentInfo(): AgentInfo | null {
    return this.agentInfo;
  }

  async sendMessage(content: string): Promise<AgentResponse> {
    console.log('[AgentService] Sending message:', content);
    console.log('[AgentService] Session ID:', this.sessionId);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId: this.sessionId
        })
      });

      console.log('[AgentService] Response status:', response.status);
      console.log('[AgentService] Response time:', Date.now() - startTime, 'ms');

      const data = await response.json();
      console.log('[AgentService] Response data:', data);

      if (!response.ok) {
        console.error('[AgentService] Error response:', data);
        throw new Error(data.error || 'Failed to get response');
      }

      return data;
    } catch (error) {
      console.error('[AgentService] Request failed:', error);
      throw error;
    }
  }

  clearHistory(): void {
    console.log('[AgentService] Clearing history for session:', this.sessionId);
    fetch('/api/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId })
    });
    this.sessionId = `session-${Date.now()}`;
    console.log('[AgentService] New session:', this.sessionId);
  }

  getHistory(): Array<{ role: string; content: string }> {
    return [];
  }
}
