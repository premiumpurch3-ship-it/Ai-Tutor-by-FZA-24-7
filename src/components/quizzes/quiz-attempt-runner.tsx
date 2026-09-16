"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  id: string;
  question_index: number;
  question: string;
  options: string[];
}

interface ReviewItem {
  questionId: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  selectedIndex: number | null;
}

const SECONDS_PER_QUESTION = 60; // mock-test style timer

export function QuizAttemptRunner({ quizId }: { quizId: string }) {
  const [loading, setLoading] = useState(true);
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timedMode, setTimedMode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; review: ReviewItem[] } | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/quizzes/${quizId}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not load quiz.");
        return;
      }
      setQuizTitle(json.quiz.title);
      setQuestions(json.questions);
      setLoading(false);
    })();
  }, [quizId]);

  useEffect(() => {
    if (!timedMode || secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, timedMode, result]);

  function startTimed() {
    setTimedMode(true);
    setSecondsLeft(questions.length * SECONDS_PER_QUESTION);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to submit quiz.");
        return;
      }
      setResult({ score: json.attempt.score, total: json.attempt.total, review: json.review });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-white/30" /></div>;

  if (result) {
    return (
      <div className="space-y-6">
        <Card>
          <h1 className="text-xl font-semibold text-white">{quizTitle} — Results</h1>
          <p className="mt-2 text-3xl font-semibold text-white">{result.score}/{result.total}</p>
          <p className="text-sm text-white/50">{Math.round((result.score / result.total) * 100)}% correct</p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => router.push(`/quizzes/${quizId}`)}>Back to quiz</Button>
            <Button size="sm" variant="secondary" onClick={() => router.refresh()}>Try again</Button>
          </div>
        </Card>
        <div className="space-y-3">
          {result.review.map((r) => (
            <Card key={r.questionId}>
              <p className="font-medium text-white">{r.question}</p>
              <div className="mt-3 space-y-1.5">
                {r.options.map((opt, i) => {
                  const isCorrect = i === r.correctOptionIndex;
                  const isSelected = i === r.selectedIndex;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        isCorrect ? "bg-emerald-500/10 text-emerald-300" : isSelected ? "bg-red-500/10 text-red-300" : "text-white/60"
                      }`}
                    >
                      {isCorrect ? <CheckCircle2 size={14} /> : isSelected ? <XCircle size={14} /> : <span className="w-3.5" />}
                      {opt}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-white/40">{r.explanation}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">{quizTitle}</h1>
          {timedMode ? (
            <Badge tone={secondsLeft !== null && secondsLeft < 30 ? "danger" : "default"}>
              <Clock size={12} className="mr-1 inline" /> {Math.floor((secondsLeft ?? 0) / 60)}:{String((secondsLeft ?? 0) % 60).padStart(2, "0")}
            </Badge>
          ) : (
            <Button size="sm" variant="secondary" onClick={startTimed}>Start timed mock test</Button>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <Card key={q.id}>
            <p className="font-medium text-white">{qi + 1}. {q.question}</p>
            <div className="mt-3 space-y-1.5">
              {q.options.map((opt, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    answers[q.id] === i ? "bg-[var(--primary)]/20 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    className="hidden"
                    checked={answers[q.id] === i}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Button onClick={handleSubmit} disabled={submitting || Object.keys(answers).length === 0} className="w-full">
        {submitting ? "Submitting..." : `Submit (${Object.keys(answers).length}/${questions.length} answered)`}
      </Button>
    </div>
  );
}
