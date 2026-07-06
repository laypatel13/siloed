import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { mockTasks } from "@/lib/mock-data";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks | Siloed" }] }),
  component: TasksPage,
});

function TasksPage() {
  const tasks = mockTasks.filter((t) => t.workspaceId === "ws-1");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tasks
          </h1>
          <Badge variant="secondary" className="font-normal">
            Product Team
          </Badge>
        </div>

        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <CheckSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No tasks yet. Ask the assistant to save one.
              </p>
            </div>
          )}
          {tasks.map((task) => (
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
                  {new Date(task.createdAt).toLocaleDateString(undefined, {
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
    </AppShell>
  );
}
