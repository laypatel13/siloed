import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Layers, Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Redirects to /login if there's no active Supabase session, and again
 * the moment one ends (e.g. token expiry, sign-out in another tab) --
 * every dashboard page renders through AppShell, so gating it here
 * protects chat/documents/tasks/tool-logs in one place. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      setChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate({ to: "/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!checked) return <FullScreenSpinner />;
  return <>{children}</>;
}

/** Blocks rendering the sidebar/page content until workspaces have loaded,
 * and prompts a brand-new user to create their first workspace instead of
 * rendering a dashboard with nothing to show. */
function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { activeWorkspace, isLoading, error, createWorkspace } = useWorkspace();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  if (isLoading) return <FullScreenSpinner />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!activeWorkspace) {
    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      setCreating(true);
      setCreateError(null);
      try {
        await createWorkspace(name.trim());
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : "Failed to create workspace"
        );
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={handleCreate}
          className="w-full max-w-sm space-y-4 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Create your first workspace
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Workspaces keep documents, chats, and tasks isolated from each
              other.
            </p>
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product Team"
            required
          />
          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
          <Button type="submit" className="w-full gap-2" disabled={creating}>
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "Create workspace"}
          </Button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <WorkspaceProvider>
        <WorkspaceGate>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex flex-1 flex-col">
                <header className="flex h-14 items-center gap-4 border-b px-4">
                  <SidebarTrigger />
                </header>
                <main className="flex-1 overflow-auto p-6">{children}</main>
              </div>
            </div>
          </SidebarProvider>
        </WorkspaceGate>
      </WorkspaceProvider>
    </AuthGuard>
  );
}
