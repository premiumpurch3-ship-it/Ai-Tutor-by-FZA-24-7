"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { toast } from "sonner";

export function LessonGenerateForm({ documentId }: { documentId: string }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, topic: topic || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to generate lesson.");
        return;
      }
      toast.success("Lesson generated.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 flex gap-2">
      <Input placeholder="Optional topic (e.g. 'Chapter 3')" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <Button size="sm" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate lesson"}</Button>
    </div>
  );
}
