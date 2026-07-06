import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Wrench,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/lib/workspace-context";
import { listToolCalls, type ApiToolCall } from "@/lib/api";

export const Route = createFileRoute("/tool-logs")({
  head: () => ({ meta: [{ title: "Tool Logs | Siloed" }] }),
  component: ToolLogsPage,
});

function ToolLogsPage() {
  const { activeWorkspace } = useWorkspace();
  const [logs, setLogs] = useState<ApiToolCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setLogs(await listToolCalls(activeWorkspace.id));
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load tool logs"
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace.id]);

  // Re-fetch whenever the active workspace changes -- the tool-call log is
  // scoped to a single workspace, never merged across the switcher.
  useEffect(() => {
    setExpanded(new Set());
    refresh();
  }, [refresh]);

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
            {activeWorkspace.name}
          </Badge>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </div>
        )}

        <div className="space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading tool logs...
            </div>
          )}
          {!isLoading && logs.length === 0 && !loadError && (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Wrench className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No tool calls yet. Interact with the assistant to trigger tools.
              </p>
            </div>
          )}
          {!isLoading &&
            logs.map((log) => (
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
                      <span className="text-sm font-medium">{log.tool_name}</span>
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
                    {new Date(log.created_at).toLocaleTimeString([], {
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
