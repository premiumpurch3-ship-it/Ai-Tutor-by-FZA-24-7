import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { FlashcardGenerator } from "@/components/flashcards/flashcard-generator";
import { Card, EmptyState } from "@/components/ui/primitives";
import Link from "next/link";
import { Layers } from "lucide-react";

export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<{ documentId?: string }> }) {
  const user = await requireUser();
  const { documentId } = await searchParams;
  const supabase = await createClient();

  const [{ data: decks }, { data: documents }] = await Promise.all([
    supabase.from("flashcard_decks").select("*, flashcards(count)").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("documents").select("id, title").eq("user_id", user.id).eq("status", "ready"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Flashcards</h1>
        <p className="text-sm text-white/50">Generate and review flashcard decks from your documents.</p>
      </div>

      <FlashcardGenerator documents={documents ?? []} initialDocumentId={documentId} />

      {decks && decks.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => (
            <Link key={d.id} href={`/flashcards/${d.id}`}>
              <Card className="h-full transition-colors hover:border-[var(--primary)]/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50"><Layers size={18} /></div>
                <h3 className="mt-3 font-medium text-white">{d.title}</h3>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="mt-1 text-xs text-white/40">{(d as any).flashcards?.[0]?.count ?? 0} cards</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card><EmptyState title="No flashcard decks yet" description="Generate one from a ready document above." /></Card>
      )}
    </div>
  );
}
