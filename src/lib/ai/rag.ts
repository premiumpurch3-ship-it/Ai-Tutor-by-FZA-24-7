import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "./gemini";

export interface RetrievedChunk {
  id: string;
  document_id: string;
  content: string;
  document_title: string;
}

/**
 * Retrieves the most relevant chunks for a question using Postgres full-text
 * search (websearch_to_tsquery against the generated tsvector column).
 *
 * This is a deliberate, documented substitute for a vector-embedding
 * pipeline: it avoids requiring the pgvector extension or an embeddings API
 * budget, while still giving the AI tutor grounded, user-specific context.
 * See SETUP.md "Architecture notes" for how to swap in pgvector later.
 */
export async function retrieveRelevantChunks(
  supabase: SupabaseClient,
  userId: string,
  question: string,
  opts: { documentId?: string; limit?: number } = {}
): Promise<RetrievedChunk[]> {
  const limit = opts.limit ?? 6;

  let query = supabase
    .from("document_chunks")
    .select("id, document_id, content, documents!inner(title, user_id)")
    .eq("user_id", userId)
    .textSearch("content_tsv", toTsQuery(question), { type: "websearch" })
    .limit(limit);

  if (opts.documentId) {
    query = query.eq("document_id", opts.documentId);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    // Fallback: if full-text search finds nothing (e.g. short/vague question),
    // grab the most recent chunks so the tutor still has some grounding.
    let fallback = supabase
      .from("document_chunks")
      .select("id, document_id, content, documents!inner(title, user_id)")
      .eq("user_id", userId)
      .order("chunk_index", { ascending: true })
      .limit(limit);
    if (opts.documentId) fallback = fallback.eq("document_id", opts.documentId);
    const { data: fallbackData } = await fallback;
    return (fallbackData ?? []).map(mapRow);
  }

  return data.map(mapRow);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RetrievedChunk {
  return {
    id: row.id,
    document_id: row.document_id,
    content: row.content,
    document_title: row.documents?.title ?? "Untitled document",
  };
}

function toTsQuery(question: string): string {
  // websearch_to_tsquery tolerates natural language reasonably well;
  // strip characters that could otherwise error the query.
  return question.replace(/['"]/g, " ").trim().slice(0, 300) || "study";
}

const TUTOR_SYSTEM_PROMPT = `You are AI Tutor, a friendly and precise study assistant.
Answer the student's question primarily using the provided material excerpts.
Rules:
- If the excerpts contain the answer, explain it clearly and cite which part of the material you used.
- If the excerpts do NOT contain enough information to answer, say so explicitly (e.g. "Your uploaded material doesn't cover this directly, but here's a general explanation:") before optionally giving a general answer.
- Never pretend the material says something it doesn't.
- Keep answers focused and easy to understand; use short paragraphs or bullet points.`;

export async function answerWithRag(params: {
  question: string;
  chunks: RetrievedChunk[];
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const { question, chunks, history = [] } = params;

  const context =
    chunks.length > 0
      ? chunks
          .map((c, i) => `[Excerpt ${i + 1} — from "${c.document_title}"]\n${c.content}`)
          .join("\n\n")
      : "(No matching material was found in the student's uploaded documents.)";

  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
    .join("\n");

  const prompt = `${historyText ? historyText + "\n\n" : ""}Relevant material:\n${context}\n\nStudent question: ${question}\n\nTutor answer:`;

  return generateText(prompt, TUTOR_SYSTEM_PROMPT);
}
