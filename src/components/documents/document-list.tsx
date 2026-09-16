"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DocumentRow } from "@/types/database";

export function DocumentList({ initialDocuments }: { initialDocuments: DocumentRow[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Failed to delete document.");
        return;
      }
      toast.success("Document deleted.");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (initialDocuments.length === 0) {
    return (
      <Card>
        <EmptyState title="No documents yet" description="Upload a file above to build your first AI tutor context." />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {initialDocuments.map((doc) => (
        <Card key={doc.id} className="flex flex-col">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50">
              <FileText size={18} />
            </div>
            <button
              onClick={() => handleDelete(doc.id)}
              disabled={deletingId === doc.id}
              className="text-white/30 hover:text-red-400 disabled:opacity-50"
              aria-label="Delete document"
            >
              {deletingId === doc.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          </div>
          <Link href={`/documents/${doc.id}`} className="mt-3 line-clamp-2 font-medium text-white hover:underline">
            {doc.title}
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={doc.status === "ready" ? "success" : doc.status === "error" ? "danger" : "warning"}>
              {doc.status}
            </Badge>
            <span className="text-xs uppercase text-white/30">{doc.file_type}</span>
          </div>
          {doc.status === "error" && doc.error_message && (
            <p className="mt-2 text-xs text-red-400">{doc.error_message}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
