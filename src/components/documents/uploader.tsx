"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Subject } from "@/types/database";

const ACCEPTED = ".pdf,.docx,.txt";

export function DocumentUploader({ subjects }: { subjects: Subject[] }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [subjectId, setSubjectId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFile(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^.]+$/, ""));
      if (subjectId) formData.append("subjectId", subjectId);

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Upload failed.");
        return;
      }

      if (json.document?.status === "error") {
        toast.error(`Processing failed: ${json.document.error_message}`);
      } else {
        toast.success("Document uploaded and processed.");
      }
      router.refresh();
    } catch {
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <Card>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-white/10 hover:border-white/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = "";
          }}
        />
        {isUploading ? (
          <>
            <Loader2 className="mb-3 animate-spin text-[var(--primary)]" size={28} />
            <p className="text-sm text-white/60">Uploading and processing your document...</p>
          </>
        ) : (
          <>
            <Upload className="mb-3 text-white/40" size={28} />
            <p className="text-sm text-white">Drag & drop a file, or click to browse</p>
            <p className="mt-1 text-xs text-white/40">PDF, DOCX, or TXT — up to 20MB</p>
          </>
        )}
      </div>

      {subjects.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <label className="text-xs text-white/40">Subject:</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs text-white outline-none"
          >
            <option value="">None</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-3">
        <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          Browse files
        </Button>
      </div>
    </Card>
  );
}
