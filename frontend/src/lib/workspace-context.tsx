import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockWorkspaces, type Workspace } from "@/lib/mock-data";

const ACTIVE_WORKSPACE_STORAGE_KEY = "siloed:active-workspace-id";

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  activeWorkspaceId: string;
  setActiveWorkspaceId: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

function readStoredWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  } catch {
    // localStorage can throw in some browser privacy modes; fall back silently.
    return null;
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(
    () => {
      const stored = readStoredWorkspaceId();
      const isValid = stored && mockWorkspaces.some((w) => w.id === stored);
      return isValid ? stored! : mockWorkspaces[0].id;
    }
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ACTIVE_WORKSPACE_STORAGE_KEY,
        activeWorkspaceId
      );
    } catch {
      // Ignore write failures (e.g. storage disabled) -- switching still
      // works for the current session, it just won't persist.
    }
  }, [activeWorkspaceId]);

  const setActiveWorkspaceId = (workspaceId: string) => {
    if (!mockWorkspaces.some((w) => w.id === workspaceId)) return;
    setActiveWorkspaceIdState(workspaceId);
  };

  const activeWorkspace = useMemo(
    () =>
      mockWorkspaces.find((w) => w.id === activeWorkspaceId) ??
      mockWorkspaces[0],
    [activeWorkspaceId]
  );

  const value = useMemo(
    () => ({
      workspaces: mockWorkspaces,
      activeWorkspace,
      activeWorkspaceId: activeWorkspace.id,
      setActiveWorkspaceId,
    }),
    [activeWorkspace]
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
