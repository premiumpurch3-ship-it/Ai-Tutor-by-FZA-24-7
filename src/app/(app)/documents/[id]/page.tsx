import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { MessageCircle, BookOpen, FileSearch, ListChecks, Layers } from "lucide-react";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!doc) notFound();

  const [{ data: lessons }, { data: summaries }, { data: quizzes }, { data: decks }] = await Promise.all([
    supabase.from("lessons").select("*").eq("document_id", id).order("created_at", { ascending: false }),
    supabase.from("summaries").select("*").eq("document_id", id).order("created_at", { ascending: false }),
    supabase.from("quizzes").select("*").eq("document_id", id).order("created_at", { ascending: false }),
    supabase.from("flashcard_decks").select("*").eq("document_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{doc.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={doc.status === "ready" ? "success" : doc.status === "error" ? "danger" : "warning"}>{doc.status}</Badge>
            <span className="text-xs text-white/40">{doc.page_count ? `${doc.page_count} pages` : doc.file_type.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {doc.status !== "ready" ? (
        <Card>
          <p className="text-sm text-white/60">
            {doc.status === "error"
              ? `This document couldn't be processed: ${doc.error_message}`
              : "This document is still processing. Refresh in a moment."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button href={`/tutor?documentId=${doc.id}`} variant="secondary" className="h-24 flex-col gap-2">
            <MessageCircle size={20} /> Ask AI Tutor
          </Button>
          <Button href={`/quizzes?documentId=${doc.id}`} variant="secondary" className="h-24 flex-col gap-2">
            <ListChecks size={20} /> Generate quiz
          </Button>
          <Button href={`/flashcards?documentId=${doc.id}`} variant="secondary" className="h-24 flex-col gap-2">
            <Layers size={20} /> Generate flashcards
          </Button>
          <Button href={`/documents/${doc.id}#lessons`} variant="secondary" className="h-24 flex-col gap-2">
            <BookOpen size={20} /> Lessons & summaries
          </Button>
        </div>
      )}

      <div id="lessons" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><BookOpen size={16} /> Lessons</h2>
          {lessons && lessons.length > 0 ? (
            <div className="space-y-2">
              {lessons.map((l) => (
                <details key={l.id} className="rounded-xl bg-white/5 p-3">
                  <summary className="cursor-pointer text-sm text-white">{l.title}</summary>
                  <div className="mt-2 space-y-2 text-sm text-white/60">
                    <p>{l.content.explanation}</p>
                    {l.content.key_concepts?.length > 0 && (
                      <ul className="list-disc pl-5">{l.content.key_concepts.map((k: string, i: number) => <li key={i}>{k}</li>)}</ul>
                    )}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">No lessons yet. Generate one from the AI Tutor form below.</p>
          )}
          <LessonGenerateForm documentId={doc.id} />
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><FileSearch size={16} /> Summaries</h2>
          {summaries && summaries.length > 0 ? (
            <div className="space-y-2">
              {summaries.map((s) => (
                <details key={s.id} className="rounded-xl bg-white/5 p-3">
                  <summary className="cursor-pointer text-sm text-white capitalize">{s.scope} summary</summary>
                  <div className="mt-2 space-y-2 text-sm text-white/60">
                    <p>{s.content.summary}</p>
                    {s.content.key_points?.length > 0 && (
                      <ul className="list-disc pl-5">{s.content.key_points.map((k: string, i: number) => <li key={i}>{k}</li>)}</ul>
                    )}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">No summaries yet.</p>
          )}
          <SummaryGenerateForm documentId={doc.id} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-white">Quizzes from this document</h2>
          {quizzes && quizzes.length > 0 ? (
            <div className="space-y-2">
              {quizzes.map((q) => (
                <a key={q.id} href={`/quizzes/${q.id}`} className="block rounded-xl bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10">
                  {q.title} · {q.question_count} questions · {q.difficulty}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">None yet.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold text-white">Flashcard decks from this document</h2>
          {decks && decks.length > 0 ? (
            <div className="space-y-2">
              {decks.map((d) => (
                <a key={d.id} href={`/flashcards/${d.id}`} className="block rounded-xl bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10">
                  {d.title}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">None yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

// Kept in-file as tiny client islands to avoid extra files for two small forms.
import { LessonGenerateForm } from "@/components/documents/lesson-generate-form";
import { SummaryGenerateForm } from "@/components/documents/summary-generate-form";
