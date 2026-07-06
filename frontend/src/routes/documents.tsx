import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Upload, FileText, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { mockDocuments, type Document } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-context";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Documents | Siloed" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>(() =>
    mockDocuments.filter((d) => d.workspaceId === activeWorkspace.id)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Re-scope the visible documents whenever the active workspace changes --
  // this is the frontend mirror of the backend's isolation guarantee: never
  // show a document (even a locally-added mock one) from another workspace.
  useEffect(() => {
    setDocuments(
      mockDocuments.filter((d) => d.workspaceId === activeWorkspace.id)
    );
    setUploading(null);
  }, [activeWorkspace.id]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => simulateUpload(file.name));
  };

  const simulateUpload = (filename: string) => {
    const tempId = `temp-${Date.now()}`;
    const tempDoc: Document = {
      id: tempId,
      workspaceId: activeWorkspace.id,
      filename,
      contentHash: "temp",
      status: "processing",
      createdAt: new Date().toISOString(),
    };
    setDocuments((prev) => [tempDoc, ...prev]);
    setUploading(tempId);

    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === tempId ? { ...d, status: "processed" } : d
        )
      );
      setUploading(null);
    }, 2000);
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => simulateUpload(file.name));
    e.target.value = "";
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
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
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

        <div className="space-y-2">
          {documents.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No documents yet. Upload one to get started.
              </p>
            </div>
          )}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3"
            >
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc.status === "processing" || uploading === doc.id ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processing
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Processed
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
