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
  AlertCircle
} from "lucide-react";
import greenlightLogo from "@assets/greenlight_logo_1767803838031.png";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: number;
}

export function ChatInterface() {
  const { accounts } = useMsal();
  const account = useAccount(accounts[0] || {});
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const agentServiceRef = useRef<AgentService | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize agent service
  useEffect(() => {
    if (account && !agentServiceRef.current) {
      agentServiceRef.current = new AgentService();
      
      agentServiceRef.current.initialize()
        .then((result) => {
          setIsInitialized(result.status === 'ready');
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to initialize agent:", err);
          setError("Failed to connect to HPA 2026 OMC Agent");
        });
    }
  }, [account]);

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
              <p className="text-sm text-muted-foreground">
                Agent: aescher2
              </p>
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

        {/* Data Sources */}
        <div className="flex gap-2 mt-3">
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
