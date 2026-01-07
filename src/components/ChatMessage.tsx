import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Bot, User, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  isLoading?: boolean;
  timestamp?: number;
}

export function ChatMessage({ 
  role, 
  content, 
  sources = [], 
  isLoading = false,
  timestamp 
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 py-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser 
            ? "bg-fx-light-blue text-fx-dark-blue" 
            : "bg-fx-dark-blue text-fx-light-blue border border-fx-light-blue/20"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-3",
            isUser
              ? "bg-fx-light-blue text-fx-dark-blue"
              : "bg-card border border-border"
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-fx-light-blue/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-fx-light-blue/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-fx-light-blue/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          ) : (
            <div className={cn(
              "markdown-content text-sm",
              isUser ? "text-fx-dark-blue" : "text-foreground"
            )}>
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {sources.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs gap-1 bg-card/50"
              >
                <FileText className="h-3 w-3" />
                {source}
              </Badge>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {timestamp && !isLoading && (
          <span className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}
