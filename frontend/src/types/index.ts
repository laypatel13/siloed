// Shared frontend types.
//
// Note: this file used to be lib/mock-data.ts. The Workspace/Task/ToolLog
// interfaces and every mock* array it also exported were leftover from
// before the real API was wired up and were never imported anywhere in the
// app -- they've been dropped as dead code during the restructure. Only the
// three types actually in use (ChatMessage, Citation, Document) are kept.

export interface Document {
  id: string;
  workspaceId: string;
  filename: string;
  contentHash: string;
  status: "processing" | "processed" | "error";
  createdAt: string;
}

export interface Citation {
  number: number;
  filename: string;
  snippet: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  workspaceId: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt: string;
}
