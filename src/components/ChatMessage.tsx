import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Bot, User, FileText, Clock, Coins, Wrench, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";

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

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  isLoading?: boolean;
  timestamp?: number;
  meta?: MessageMeta;
}

export function ChatMessage({ 
  role, 
  content, 
  sources = [], 
  isLoading = false,
  timestamp,
  meta
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

        {/* Message Metadata */}
        {meta && !isLoading && !isUser && (
          <div className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2 flex flex-wrap gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {(meta.duration_ms / 1000).toFixed(2)}s
            </span>
            {meta.tokens && (
              <span className="flex items-center gap-1">
                <Coins className="h-3 w-3" />
                {meta.tokens.total} tokens
              </span>
            )}
            <span className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Tools: {meta.tool_used ? "Yes" : "No"}
              {meta.tool_used && meta.tool_names.length > 0 && (
                <span className="text-muted-foreground/70">
                  ({meta.tool_names.join(', ')})
                </span>
              )}
            </span>
            {meta.safety?.status === "passed" && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                Safety: Passed
              </span>
            )}
            {meta.safety?.status === "blocked" && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                <ShieldAlert className="h-3 w-3" />
                Blocked: {meta.safety.violation}
              </span>
            )}
            {meta.safety?.status === "truncated" && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Shield className="h-3 w-3" />
                Truncated
              </span>
            )}
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
