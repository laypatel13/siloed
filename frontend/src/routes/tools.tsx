import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Wrench,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/layout/app-shell";
import { useActiveWorkspace } from "@/contexts/workspace-context";
import {
  listTools,
  invokeTool,
  type ApiToolDefinition,
} from "@/lib/api";

export const Route = createFileRoute("/tools")({
  head: () => ({ meta: [{ title: "Tools | Siloed" }] }),
  component: ToolsPage,
});

function ToolsPage() {
  return (
    <AppShell>
      <ToolsPageContent />
    </AppShell>
  );
}

function ToolsPageContent() {
  const activeWorkspace = useActiveWorkspace();
  const [tools, setTools] = useState<ApiToolDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setTools(await listTools(activeWorkspace.id));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load tools");
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace.id]);

  // Re-fetch whenever the active workspace changes -- invoking a tool
  // always runs it against the workspace currently selected here.
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tools
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Call a tool directly, without going through the assistant.
            Runs against the active workspace and is validated and logged
            exactly like a call the model makes.
          </p>
        </div>
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

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading tools...
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <ToolCard
              key={tool.name}
              tool={tool}
              workspaceId={activeWorkspace.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCard({
  tool,
  workspaceId,
}: {
  tool: ApiToolDefinition;
  workspaceId: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const handleChange = (field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      // Empty strings are sent as-is rather than omitted -- this is
      // deliberate: it lets you exercise the "missing/blank required
      // field" rejection path from this form too, the same way the
      // assistant's own validation would reject it.
      const res = await invokeTool(workspaceId, tool.name, values);
      setResult(res.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tool call failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <form
      onSubmit={handleRun}
      className="flex flex-col gap-4 rounded-lg border bg-card p-4"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">{tool.name}</span>
      </div>
      <p className="text-sm text-muted-foreground">{tool.description}</p>

      <div className="space-y-3">
        {tool.fields.map((field) => (
          <div key={field.name} className="space-y-1">
            <Label htmlFor={`${tool.name}-${field.name}`} className="text-xs">
              {field.name}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id={`${tool.name}-${field.name}`}
              value={values[field.name] ?? ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.type}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Success
          </div>
          <pre className="rounded-md bg-muted p-2 text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <Button type="submit" disabled={isRunning} className="gap-2 w-fit">
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {isRunning ? "Running..." : "Run"}
      </Button>
    </form>
  );
}
