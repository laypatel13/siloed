import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import {
  mockChatHistory,
  type ChatMessage,
  type Citation,
} from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-context";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [{ title: "Chat | Siloed" }],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { activeWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    mockChatHistory.filter((m) => m.workspaceId === activeWorkspace.id)
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Switching workspaces must not carry chat history (or an in-flight
  // typing indicator) over from the previous workspace -- each workspace's
  // chat is grounded only in that workspace's own documents.
  useEffect(() => {
    setMessages(
      mockChatHistory.filter((m) => m.workspaceId === activeWorkspace.id)
    );
    setInput("");
    setIsTyping(false);
  }, [activeWorkspace.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        workspaceId: activeWorkspace.id,
        role: "assistant",
        content:
          "That's a great question. Based on the documents in this workspace, I can help you explore that further. Would you like me to save this as a task or search for related information in your uploaded files?",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-7rem)] flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Chat
          </h1>
          <Badge variant="secondary" className="font-normal">
            {activeWorkspace.name}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border bg-card p-4">
          <div className="space-y-6">
            {messages.length === 0 && !isTyping && (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <BookOpen className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No conversation yet in {activeWorkspace.name}. Ask
                  something about this workspace&apos;s documents.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="rounded-lg border bg-muted px-4 py-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your workspace documents..."
            className="min-h-[48px] resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="shrink-0 h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isUnknown = message.content.includes("I don't have any information");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] space-y-2 ${
          isUser ? "text-right" : "text-left"
        }`}
      >
        <div
          className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground"
              : isUnknown
                ? "border border-dashed border-muted-foreground/30 bg-muted/50 text-muted-foreground"
                : "border bg-card text-card-foreground"
          }`}
        >
          {isUnknown && (
            <div className="mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">I don&apos;t know</span>
            </div>
          )}
          <MessageContent
            content={message.content}
            citations={message.citations}
          />
        </div>
        <span className="block text-xs text-muted-foreground">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

function MessageContent({
  content,
  citations,
}: {
  content: string;
  citations?: Citation[];
}) {
  if (!citations || citations.length === 0) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const parts = content.split(/(\[\d+\])/g);
  const citationMap = new Map(citations.map((c) => [`[${c.number}]`, c]));

  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const citation = citationMap.get(part);
        if (citation) {
          return (
            <CitationPopover key={i} citation={citation}>
              <span className="inline-flex h-5 min-w-[20px] cursor-pointer items-center justify-center rounded bg-accent px-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                {citation.number}
              </span>
            </CitationPopover>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

function CitationPopover({
  citation,
  children,
}: {
  citation: Citation;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Source
            </span>
            <Badge variant="outline" className="text-xs">
              {(citation.similarity * 100).toFixed(0)}% match
            </Badge>
          </div>
          <p className="text-sm font-medium">{citation.filename}</p>
          <blockquote className="border-l-2 border-primary pl-3 text-xs text-muted-foreground italic">
            &ldquo;{citation.snippet}&rdquo;
          </blockquote>
        </div>
      </PopoverContent>
    </Popover>
  );
}
