import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { type Document } from "@/lib/mock-data";
import { useActiveWorkspace } from "@/lib/workspace-context";
import { listDocuments, uploadDocument } from "@/lib/api";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Documents | Siloed" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const activeWorkspace = useActiveWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const docs = await listDocuments(activeWorkspace.id);
      setDocuments(
        docs.map((d) => ({
          id: d.id,
          workspaceId: activeWorkspace.id,
          filename: d.filename,
          contentHash: "",
          status: "processed" as const,
          createdAt: d.created_at,
        }))
      );
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load documents"
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace.id]);

  // Re-fetch whenever the active workspace changes -- documents are always
  // scoped to a single workspace, never merged across the switcher.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadFiles = async (files: File[]) => {
    for (const file of files) {
      const tempId = `temp-${Date.now()}-${file.name}`;
      const tempDoc: Document = {
        id: tempId,
        workspaceId: activeWorkspace.id,
        filename: file.name,
        contentHash: "",
        status: "processing",
        createdAt: new Date().toISOString(),
      };
      setDocuments((prev) => [tempDoc, ...prev]);

      try {
        await uploadDocument(activeWorkspace.id, file);
        // Re-fetch so we show the server's real id/created_at (and pick up
        // the idempotency check -- a duplicate upload won't double-count).
        await refresh();
      } catch (err) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === tempId ? { ...d, status: "error" } : d))
        );
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  // No DELETE /workspaces/{id}/documents/{doc_id} route exists on the
  // backend yet, so this only removes the row from the visible list --
  // it does not delete the document or its chunks server-side.
  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Documents
          </h1>
          <Badge variant="secondary" className="font-normal">
            {activeWorkspace.name}
          </Badge>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30"
          }`}
        >
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drag & drop files here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse
          </p>
          <input
            type="file"
            multiple
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={handleFileInput}
          />
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
              Loading documents...
            </div>
          )}
          {!isLoading && documents.length === 0 && !loadError && (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No documents yet. Upload one to get started.
              </p>
            </div>
          )}
          {!isLoading &&
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.status === "processing" && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </Badge>
                  )}
                  {doc.status === "processed" && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Processed
                    </Badge>
                  )}
                  {doc.status === "error" && (
                    <Badge
                      variant="outline"
                      className="gap-1 text-xs border-destructive/40 text-destructive"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </AppShell>
  );
}
