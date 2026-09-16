import { requireUser } from "@/lib/actions/current-user";
import { FlashcardReviewer } from "@/components/flashcards/flashcard-reviewer";

export default async function FlashcardDeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  await requireUser();
  const { deckId } = await params;
  return <FlashcardReviewer deckId={deckId} />;
}
