"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Label, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function QuizGenerator({ documents, initialDocumentId }: { documents: { id: string; title: string }[]; initialDocumentId?: string }) {
  const [documentId, setDocumentId] = useState(initialDocumentId ?? documents[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function generate() {
    if (!documentId) {
      toast.error("Upload and select a document first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, difficulty, questionCount: count, topic: topic || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to generate quiz.");
        return;
      }
      toast.success("Quiz generated.");
      router.push(`/quizzes/${json.quiz.id}`);
    } finally {
      setLoading(false);
    }
  }

  if (documents.length === 0) {
    return (
      <Card>
        <p className="text-sm text-white/50">Upload a document first to generate a quiz from it.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold text-white">Generate a new quiz</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Document</Label>
          <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none">
            {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
        <div>
          <Label>Difficulty</Label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <Label>Questions</Label>
          <Input type="number" min={3} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
        <div>
          <Label>Topic (optional)</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis" />
        </div>
      </div>
      <Button className="mt-4" onClick={generate} disabled={loading}>
        {loading ? "Generating quiz..." : "Generate quiz"}
      </Button>
    </Card>
  );
}
