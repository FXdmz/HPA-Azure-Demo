interface MessageMeta {
  duration_ms: number;
  tokens: {
    total: number;
    prompt: number;
    completion: number;
  } | null;
  tool_used: boolean;
  tool_names: string[];
  model: string;
  safety: {
    status: string;
    violation: string | null;
  };
  citations: string[];
}

interface AgentResponse {
  id: string;
  content: string;
  sources: string[];
  threadId?: string;
  meta?: MessageMeta;
}

interface AgentInfo {
  agentName: string;
  agentId: string;
  status: string;
}

interface AgentDetails {
  name: string;
  id: string;
  model: string;
  instructions: string;
  tools: string[];
  vectorStoreIds: string[];
  createdAt: string | null;
}

interface AgentListItem {
  name: string;
  id: string;
  model: string;
  tools: string[];
  createdAt: string | null;
}

export class AgentService {
  private sessionId: string;
  private agentInfo: AgentInfo | null = null;
  private agentDetails: AgentDetails | null = null;
  private selectedAgentId: string | null = null;

  constructor() {
    this.sessionId = `session-${Date.now()}`;
    console.log('[AgentService] Initialized with session:', this.sessionId);
  }

  setSelectedAgent(agentId: string) {
    this.selectedAgentId = agentId;
    console.log('[AgentService] Selected agent:', agentId);
  }

  getSelectedAgentId(): string | null {
    return this.selectedAgentId;
  }

  async fetchAllAgents(): Promise<AgentListItem[]> {
    console.log('[AgentService] Fetching all agents...');
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents list');
      }
      const data = await response.json();
      console.log('[AgentService] Agents list:', data);
      return data.agents || [];
    } catch (error) {
      console.error('[AgentService] Failed to fetch agents:', error);
      return [];
    }
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

  async fetchAgentDetails(): Promise<AgentDetails | null> {
    console.log('[AgentService] Fetching agent details...');
    try {
      const response = await fetch('/api/agent');
      if (!response.ok) {
        throw new Error('Failed to fetch agent details');
      }
      const data = await response.json();
      console.log('[AgentService] Agent details:', data);
      
      this.agentDetails = {
        name: data.name || 'Unknown',
        id: data.id || 'Unknown',
        model: data.model || 'Unknown',
        instructions: data.instructions || '',
        tools: data.tools || [],
        vectorStoreIds: data.vectorStoreIds || [],
        createdAt: data.createdAt || null
      };
      
      return this.agentDetails;
    } catch (error) {
      console.error('[AgentService] Failed to fetch agent details:', error);
      return null;
    }
  }

  getAgentInfo(): AgentInfo | null {
    return this.agentInfo;
  }

  getAgentDetails(): AgentDetails | null {
    return this.agentDetails;
  }

  async sendMessage(content: string): Promise<AgentResponse> {
    console.log('[AgentService] Sending message:', content);
    console.log('[AgentService] Session ID:', this.sessionId);
    console.log('[AgentService] Agent ID:', this.selectedAgentId);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId: this.sessionId,
          agentId: this.selectedAgentId
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
