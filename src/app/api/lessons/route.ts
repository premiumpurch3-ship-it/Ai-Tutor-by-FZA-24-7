import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLessonSchema } from "@/lib/validation/schemas";
import { checkEntitlement, recordUsage } from "@/lib/usage/entitlements";
import { retrieveRelevantChunks } from "@/lib/ai/rag";
import { generateJSON } from "@/lib/ai/gemini";
import { logSystemError } from "@/lib/observability/log-error";

interface LessonAI {
  explanation: string;
  key_concepts: string[];
  examples: string[];
  review_questions: string[];
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documentId = request.nextUrl.searchParams.get("documentId");
  let query = supabase.from("lessons").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (documentId) query = query.eq("document_id", documentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lessons: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = generateLessonSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const entitlement = await checkEntitlement(supabase, user.id, "ai_messages");
  if (!entitlement.allowed) {
    return NextResponse.json({ error: "You've reached your monthly AI usage limit. Upgrade your plan to continue." }, { status: 403 });
  }

  const { documentId, topic } = parsed.data;
  const { data: doc } = await supabase.from("documents").select("id, title, user_id, status").eq("id", documentId).eq("user_id", user.id).single();
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (doc.status !== "ready") return NextResponse.json({ error: "Document is not ready yet." }, { status: 400 });

  const chunks = await retrieveRelevantChunks(supabase, user.id, topic || doc.title, { documentId, limit: 8 });
  const context = chunks.map((c) => c.content).join("\n\n").slice(0, 12000);

  try {
    const lesson = await generateJSON<LessonAI>(
      `Create a beginner-friendly lesson${topic ? ` focused on "${topic}"` : ""} based on this material:\n\n${context}\n\nRespond with JSON: { "explanation": string, "key_concepts": string[], "examples": string[], "review_questions": string[] }`,
      "You are an expert tutor creating a clear, structured lesson strictly grounded in the provided material."
    );

    const { data: saved, error: saveError } = await supabase
      .from("lessons")
      .insert({
        user_id: user.id,
        document_id: documentId,
        title: topic ? `${doc.title} — ${topic}` : doc.title,
        content: lesson,
      })
      .select()
      .single();

    if (saveError) throw new Error(saveError.message);

    await recordUsage(supabase, user.id, "ai_messages");
    return NextResponse.json({ lesson: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate lesson.";
    await logSystemError(supabase, { userId: user.id, scope: "lesson_generation", message, metadata: { documentId } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
