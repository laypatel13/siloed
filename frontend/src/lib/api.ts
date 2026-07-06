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
