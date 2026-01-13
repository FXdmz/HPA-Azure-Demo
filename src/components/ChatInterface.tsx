import { useState, useEffect, useRef } from "react";
import { useMsal, useAccount } from "@azure/msal-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { AgentService } from "@/services/agentService";
import { 
  RotateCcw, 
  Settings, 
  Zap, 
  FileText,
  AlertCircle,
  Cpu,
  Wrench,
  Database,
  ChevronDown,
  Bot
} from "lucide-react";
import greenlightLogo from "@assets/greenlight_logo_1767803838031.png";

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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: number;
  meta?: MessageMeta;
}

interface AgentListItem {
  name: string;
  id: string;
  model: string;
  tools: string[];
  createdAt: string | null;
}

export function ChatInterface() {
  const { accounts } = useMsal();
  const account = useAccount(accounts[0] || {});
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>("Loading...");
  const [agentId, setAgentId] = useState<string>("");
  const [agentModel, setAgentModel] = useState<string>("");
  const [agentTools, setAgentTools] = useState<string[]>([]);
  const [vectorStoreIds, setVectorStoreIds] = useState<string[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AgentListItem[]>([]);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  
  const agentServiceRef = useRef<AgentService | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize agent service
  useEffect(() => {
    if (account && !agentServiceRef.current) {
      agentServiceRef.current = new AgentService();
      
      agentServiceRef.current.initialize()
        .then(async (result) => {
          setIsInitialized(result.status === 'ready');
          setAgentName(result.agentName || 'Unknown');
          setAgentId(result.agentId || '');
          setError(null);
          
          // Set the default agent ID
          if (result.agentId) {
            agentServiceRef.current?.setSelectedAgent(result.agentId);
          }
          
          // Fetch additional agent details
          const details = await agentServiceRef.current?.fetchAgentDetails();
          if (details) {
            setAgentModel(details.model || '');
            setAgentTools(details.tools || []);
            setVectorStoreIds(details.vectorStoreIds || []);
          }
          
          // Fetch all available agents
          const agents = await agentServiceRef.current?.fetchAllAgents();
          if (agents) {
            setAvailableAgents(agents);
          }
        })
        .catch((err) => {
          console.error("Failed to initialize agent:", err);
          setError("Failed to connect to HPA 2026 OMC Agent");
        });
    }
  }, [account]);

  const handleAgentSelect = (agent: AgentListItem) => {
    setAgentName(agent.name);
    setAgentId(agent.id);
    setAgentModel(agent.model);
    setAgentTools(agent.tools);
    setShowAgentDropdown(false);
    
    if (agentServiceRef.current) {
      agentServiceRef.current.setSelectedAgent(agent.id);
      agentServiceRef.current.clearHistory();
    }
    setMessages([]);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (content: string) => {
    if (!agentServiceRef.current || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await agentServiceRef.current.sendMessage(content);
      
      const assistantMessage: Message = {
        id: response.id,
        role: "assistant",
        content: response.content,
        sources: response.sources,
        timestamp: Date.now(),
        meta: response.meta,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to get response");
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    if (agentServiceRef.current) {
      agentServiceRef.current.clearHistory();
    }
    setError(null);
  };

  return (
    <Card className="h-full flex flex-col bg-card/50 border-border">
      {/* Header */}
      <CardHeader className="flex-shrink-0 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={greenlightLogo} alt="Greenlight Logo" className="h-20 w-20" />
            <div>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                HPA 2026 OMC Agent
                {isInitialized && (
                  <Badge variant="outline" className="text-xs bg-fx-green/20 text-fx-green border-fx-green/30">
                    <Zap className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground/70 mb-1">
                Project: https://aescheraicanadaeast-resource.services.ai.azure.com/api/projects/aescheraicanadaeast
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Bot className="h-4 w-4" />
                  <span>{agentName}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAgentDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showAgentDropdown && availableAgents.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {availableAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleAgentSelect(agent)}
                        className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          agent.id === agentId ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        <div className="font-medium text-sm">{agent.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{agent.model}</span>
                          {agent.tools.length > 0 && (
                            <span className="text-muted-foreground/50">
                              {agent.tools.length} tool{agent.tools.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {agentId && agentId !== agentName && (
                <p className="text-xs text-muted-foreground/70 font-mono">
                  {agentId}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              title="Clear chat"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Agent Metadata */}
        <div className="flex flex-wrap gap-2 mt-3">
          {agentModel && (
            <Badge variant="secondary" className="gap-1">
              <Cpu className="h-3 w-3" />
              {agentModel}
            </Badge>
          )}
          {agentTools.map((tool, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              <Wrench className="h-3 w-3" />
              {tool.replace(/_/g, ' ')}
            </Badge>
          ))}
          {vectorStoreIds.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Database className="h-3 w-3" />
              {vectorStoreIds.length} Vector Store{vectorStoreIds.length > 1 ? 's' : ''}
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            MovieLabs OMC
          </Badge>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div 
            ref={scrollAreaRef}
            className="p-4 space-y-2"
          >
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="mb-4">
                  <img src={greenlightLogo} alt="Greenlight Logo" className="h-32 w-32" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Welcome to HPA 2026 OMC Agent
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask questions about MovieLabs OMC ontology. I can help you understand 
                  media production concepts and workflows.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage("What is a Creative Work in OMC?")}
                    disabled={!isInitialized || isLoading}
                  >
                    What is a Creative Work?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage("Search for VFX vendors in Vancouver")}
                    disabled={!isInitialized || isLoading}
                  >
                    VFX vendors in Vancouver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage("Explain the relationship between Asset and Depiction")}
                    disabled={!isInitialized || isLoading}
                  >
                    Asset vs Depiction
                  </Button>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                sources={message.sources}
                timestamp={message.timestamp}
                meta={message.meta}
              />
            ))}

            {isLoading && (
              <ChatMessage
                role="assistant"
                content=""
                isLoading={true}
              />
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={!isInitialized || isLoading}
      />
    </Card>
  );
}
