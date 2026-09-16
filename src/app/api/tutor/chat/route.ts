import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatMessageSchema } from "@/lib/validation/schemas";
import { checkEntitlement, recordUsage } from "@/lib/usage/entitlements";
import { retrieveRelevantChunks, answerWithRag } from "@/lib/ai/rag";
import { logSystemError } from "@/lib/observability/log-error";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = chatMessageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });

  const entitlement = await checkEntitlement(supabase, user.id, "ai_messages");
  if (!entitlement.allowed) {
    return NextResponse.json(
      { error: `You've used all ${entitlement.limit} AI messages this month on the ${entitlement.plan} plan. Upgrade for more.` },
      { status: 403 }
    );
  }

  let { conversationId } = parsed.data;
  const { message, documentId } = parsed.data;

  // Create a conversation on first message if none was supplied.
  if (!conversationId) {
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, document_id: documentId ?? null, title: message.slice(0, 60) })
      .select()
      .single();
    if (convError || !conv) return NextResponse.json({ error: "Could not start a conversation." }, { status: 500 });
    conversationId = conv.id;
  } else {
    const { data: conv } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).single();
    if (!conv) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const { data: userMessage, error: userMsgError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: message })
    .select()
    .single();
  if (userMsgError) return NextResponse.json({ error: userMsgError.message }, { status: 500 });

  try {
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const chunks = await retrieveRelevantChunks(supabase, user.id, message, { documentId });
    const answer = await answerWithRag({
      question: message,
      chunks,
      history: (history ?? []).filter((m) => m.role !== "system") as { role: "user" | "assistant"; content: string }[],
    });

    const sources = chunks.map((c) => ({ document_id: c.document_id, chunk_id: c.id, snippet: c.content.slice(0, 200) }));

    const { data: assistantMessage, error: assistantError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: answer, sources })
      .select()
      .single();
    if (assistantError) throw new Error(assistantError.message);

    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    await recordUsage(supabase, user.id, "ai_messages");

    return NextResponse.json({ conversationId, userMessage, assistantMessage });
  } catch (err) {
    const message2 = err instanceof Error ? err.message : "The AI Tutor couldn't respond. Please try again.";
    await logSystemError(supabase, { userId: user.id, scope: "ai_tutor", message: message2, metadata: { conversationId } });
    return NextResponse.json({ error: message2, conversationId }, { status: 500 });
  }
}
