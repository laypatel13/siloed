import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, Calendar, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/app-shell";
import { useActiveWorkspace } from "@/contexts/workspace-context";
import { listTasks, type ApiTask } from "@/lib/api";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks | Siloed" }] }),
  component: TasksPage,
});

function TasksPage() {
  return (
    <AppShell>
      <TasksPageContent />
    </AppShell>
  );
}

function TasksPageContent() {
  const activeWorkspace = useActiveWorkspace();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setTasks(await listTasks(activeWorkspace.id));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace.id]);

  // Re-fetch whenever the active workspace changes -- tasks are scoped to
  // a single workspace, never merged across the switcher.
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tasks
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

        <div className="space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading tasks...
            </div>
          )}
          {!isLoading && tasks.length === 0 && !loadError && (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <CheckSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No tasks yet. Ask the assistant to save one.
              </p>
            </div>
          )}
          {!isLoading &&
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{task.title}</h3>
                  {task.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
  );
}