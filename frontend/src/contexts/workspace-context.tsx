import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  listWorkspaces,
  createWorkspace as apiCreateWorkspace,
  type ApiWorkspace,
} from "@/lib/api";

const ACTIVE_WORKSPACE_STORAGE_KEY = "siloed:active-workspace-id";

interface WorkspaceContextValue {
  workspaces: ApiWorkspace[];
  activeWorkspace: ApiWorkspace | null;
  isLoading: boolean;
  error: string | null;
  setActiveWorkspaceId: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

function readStoredWorkspaceId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredWorkspaceId(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, id);
  } catch {
    // Ignore write failures (e.g. storage disabled) -- switching still
    // works for the current session, it just won't persist.
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await listWorkspaces();
      setWorkspaces(fetched);

      setActiveWorkspaceIdState((current) => {
        if (current && fetched.some((w) => w.id === current)) return current;
        const stored = readStoredWorkspaceId();
        if (stored && fetched.some((w) => w.id === stored)) return stored;
        return fetched[0]?.id ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load workspaces"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveWorkspaceId = (workspaceId: string) => {
    if (!workspaces.some((w) => w.id === workspaceId)) return;
    setActiveWorkspaceIdState(workspaceId);
    writeStoredWorkspaceId(workspaceId);
  };

  const createWorkspace = async (name: string) => {
    const created = await apiCreateWorkspace(name);
    setWorkspaces((prev) => [...prev, created]);
    setActiveWorkspaceIdState(created.id);
    writeStoredWorkspaceId(created.id);
  };

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      isLoading,
      error,
      setActiveWorkspaceId,
      createWorkspace,
    }),
    [workspaces, activeWorkspace, isLoading, error]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}

/** For page components rendered inside AppShell's WorkspaceGate, which
 * never renders its children until a workspace is active -- lets pages
 * use `activeWorkspace.id`/`.name` directly instead of null-checking on
 * every read. Throws (rather than silently misbehaving) if that
 * invariant is ever broken. */
export function useActiveWorkspace(): ApiWorkspace {
  const { activeWorkspace } = useWorkspace();
  if (!activeWorkspace) {
    throw new Error(
      "useActiveWorkspace() called with no active workspace -- this page " +
        "must only render inside AppShell's WorkspaceGate."
    );
  }
  return activeWorkspace;
}
