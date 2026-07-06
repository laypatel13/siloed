import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wrench, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { mockToolLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/tool-logs")({
  head: () => ({ meta: [{ title: "Tool Logs | Siloed" }] }),
  component: ToolLogsPage,
});

function ToolLogsPage() {
  const logs = mockToolLogs.filter((l) => l.workspaceId === "ws-1");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tool Logs
          </h1>
          <Badge variant="secondary" className="font-normal">
            Product Team
          </Badge>
        </div>

        <div className="space-y-2">
          {logs.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Wrench className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No tool calls yet. Interact with the assistant to trigger tools.
              </p>
            </div>
          )}
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border bg-card transition-colors hover:bg-accent/30"
            >
              <button
                onClick={() => toggleExpand(log.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {expanded.has(log.id) ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{log.toolName}</span>
                    {log.status === "success" ? (
                      <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200 text-xs">
                        <XCircle className="h-3 w-3" />
                        Error
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(log.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </button>

              {expanded.has(log.id) && (
                <div className="border-t px-4 py-3 space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Arguments
                    </p>
                    <pre className="rounded-md bg-muted p-2 text-xs overflow-auto">
                      {JSON.stringify(log.arguments, null, 2)}
                    </pre>
                  </div>
                  {log.result && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Result
                      </p>
                      <pre className="rounded-md bg-muted p-2 text-xs overflow-auto">
                        {JSON.stringify(log.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
