import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFlashcardsSchema } from "@/lib/validation/schemas";
import { checkEntitlement, recordUsage } from "@/lib/usage/entitlements";
import { retrieveRelevantChunks } from "@/lib/ai/rag";
import { generateJSON } from "@/lib/ai/gemini";
import { logSystemError } from "@/lib/observability/log-error";

interface FlashcardAI {
  question: string;
  answer: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documentId = request.nextUrl.searchParams.get("documentId");
  let query = supabase.from("flashcard_decks").select("*, flashcards(count)").eq("user_id", user.id).order("created_at", { ascending: false });
  if (documentId) query = query.eq("document_id", documentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ decks: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = generateFlashcardsSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const entitlement = await checkEntitlement(supabase, user.id, "flashcard_generations");
  if (!entitlement.allowed) {
    return NextResponse.json({ error: `You've used all ${entitlement.limit} flashcard generations this month. Upgrade to generate more.` }, { status: 403 });
  }

  const { documentId, count, topic } = parsed.data;
  const { data: doc } = await supabase.from("documents").select("id, title, status").eq("id", documentId).eq("user_id", user.id).single();
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (doc.status !== "ready") return NextResponse.json({ error: "Document is not ready yet." }, { status: 400 });

  const chunks = await retrieveRelevantChunks(supabase, user.id, topic || doc.title, { documentId, limit: 10 });
  const context = chunks.map((c) => c.content).join("\n\n").slice(0, 14000);

  try {
    const result = await generateJSON<{ flashcards: FlashcardAI[] }>(
      `Create exactly ${count} question/answer flashcards${topic ? ` about "${topic}"` : ""} from this material:\n\n${context}\n\nRespond with JSON: { "flashcards": [{ "question": string, "answer": string }] }`,
      "You create concise, high-signal flashcards strictly grounded in the provided material."
    );
    if (!result.flashcards || result.flashcards.length === 0) throw new Error("The AI did not return any flashcards.");

    const { data: deck, error: deckError } = await supabase
      .from("flashcard_decks")
      .insert({ user_id: user.id, document_id: documentId, title: topic ? `${doc.title} — ${topic}` : doc.title })
      .select()
      .single();
    if (deckError || !deck) throw new Error(deckError?.message ?? "Failed to save deck.");

    const { error: cardsError } = await supabase.from("flashcards").insert(
      result.flashcards.map((f) => ({ deck_id: deck.id, user_id: user.id, question: f.question, answer: f.answer }))
    );
    if (cardsError) throw new Error(cardsError.message);

    await recordUsage(supabase, user.id, "flashcard_generations");
    return NextResponse.json({ deck });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate flashcards.";
    await logSystemError(supabase, { userId: user.id, scope: "flashcard_generation", message, metadata: { documentId } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
