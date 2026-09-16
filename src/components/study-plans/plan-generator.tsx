"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Label, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Subject } from "@/types/database";

export function StudyPlanGenerator({ documents, subjects }: { documents: { id: string; title: string }[]; subjects: Subject[] }) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [documentId, setDocumentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function generate() {
    if (!title.trim()) {
      toast.error("Give your plan a title.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          goal: goal || undefined,
          examDate: examDate || undefined,
          hoursPerWeek,
          documentId: documentId || undefined,
          subjectId: subjectId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to generate study plan.");
        return;
      }
      toast.success("Study plan created.");
      router.push(`/study-plans/${json.plan.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold text-white">Create a new plan</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Biology midterm prep" />
        </div>
        <div>
          <Label>Goal (optional)</Label>
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Master cell biology" />
        </div>
        <div>
          <Label>Exam date (optional)</Label>
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
        <div>
          <Label>Hours per week</Label>
          <Input type="number" min={1} max={80} value={hoursPerWeek} onChange={(e) => setHoursPerWeek(Number(e.target.value))} />
        </div>
        {documents.length > 0 && (
          <div>
            <Label>Base on document (optional)</Label>
            <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none">
              <option value="">None</option>
              {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
        )}
        {subjects.length > 0 && (
          <div>
            <Label>Subject (optional)</Label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none">
              <option value="">None</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <Button className="mt-4" onClick={generate} disabled={loading}>
        {loading ? "Building your plan..." : "Generate study plan"}
      </Button>
    </Card>
  );
}
