import { supabase } from "@/lib/supabase";

// Same backend the auth/deps.py `verify_workspace_access` dependency
// guards -- every call here must carry the Supabase access token or the
// backend 401s regardless of which workspace is requested.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ApiCitation {
  marker: number;
  document_id: string;
  filename: string;
  chunk_index: number;
  snippet: string;
  similarity: number;
}

export interface ApiExecutedToolCall {
  tool_name: string;
  status: "success" | "error";
  result?: Record<string, unknown> | null;
  error?: string | null;
}

export interface ChatResponse {
  answer: string;
  citations: ApiCitation[];
  grounded: boolean;
  tool_calls: ApiExecutedToolCall[];
}

export interface ApiChatHistoryRow {
  role: "user" | "assistant";
  content: string;
  citations: ApiCitation[] | null;
  created_at: string;
}

export async function getChatHistory(
  workspaceId: string
): Promise<ApiChatHistoryRow[]> {
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/chat`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load chat history (${res.status})`);
  }
  return res.json();
}

export async function sendChatMessage(
  workspaceId: string,
  message: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error(`Failed to send message (${res.status})`);
  }
  return res.json();
}

export interface ApiWorkspace {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export async function listWorkspaces(): Promise<ApiWorkspace[]> {
  const res = await fetch(`${API_URL}/workspaces`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load workspaces (${res.status})`);
  }
  return res.json();
}

export async function createWorkspace(name: string): Promise<ApiWorkspace> {
  const res = await fetch(`${API_URL}/workspaces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create workspace (${res.status})`);
  }
  return res.json();
}

export interface ApiTask {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export async function listTasks(workspaceId: string): Promise<ApiTask[]> {
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/tasks`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load tasks (${res.status})`);
  }
  return res.json();
}

export interface ApiToolCall {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: "success" | "error";
  created_at: string;
}

export async function listToolCalls(
  workspaceId: string
): Promise<ApiToolCall[]> {
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/tool-calls`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load tool logs (${res.status})`);
  }
  return res.json();
}

export interface ApiToolField {
  name: string;
  type: string;
  required: boolean;
}

export interface ApiToolDefinition {
  name: string;
  description: string;
  fields: ApiToolField[];
}

export async function listTools(
  workspaceId: string
): Promise<ApiToolDefinition[]> {
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/tools`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load tools (${res.status})`);
  }
  return res.json();
}

export interface InvokeToolResult {
  status: "success";
  result: Record<string, unknown>;
}

// Manual invoke goes through the exact same validate -> execute -> log
// path a model-triggered call does (see backend/app/api/routes/tools.py),
// so a rejected call here (bad/missing arguments) is a normal 422 with a
// readable message, not a crash -- surfaced to the caller instead of
// thrown as a generic HTTP error string.
export async function invokeTool(
  workspaceId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<InvokeToolResult> {
  const res = await fetch(
    `${API_URL}/workspaces/${workspaceId}/tools/${toolName}/invoke`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify(args),
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      body && typeof body.detail === "string"
        ? body.detail
        : `Failed to run tool (${res.status})`;
    throw new Error(detail);
  }
  return body;
}

export interface ApiDocument {
  id: string;
  filename: string;
  created_at: string;
}

export interface IngestResult {
  status: "ingested" | "duplicate";
  document_id: string;
  chunk_count: number;
}

export async function listDocuments(
  workspaceId: string
): Promise<ApiDocument[]> {
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/documents`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load documents (${res.status})`);
  }
  return res.json();
}

export async function uploadDocument(
  workspaceId: string,
  file: File
): Promise<IngestResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/documents`, {
    method: "POST",
    headers: await authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Failed to upload "${file.name}" (${res.status})`);
  }
  return res.json();
}
