"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { toast } from "sonner";

export function SummaryGenerateForm({ documentId }: { documentId: string }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, scope: topic ? "topic" : "document", topic: topic || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to generate summary.");
        return;
      }
      toast.success("Summary generated.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 flex gap-2">
      <Input placeholder="Optional topic (leave blank for full document)" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <Button size="sm" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate summary"}</Button>
    </div>
  );
}
