import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await assertAdmin(supabase);
  if (error) return error;

  const [{ data: profile }, { data: subscription }, { data: usage }, { data: documents }, { data: quizAttempts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("subscriptions").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("usage").select("*").eq("user_id", id).order("period_start", { ascending: false }).limit(3),
    supabase.from("documents").select("id, title, status, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("quiz_attempts").select("score, total, started_at").eq("user_id", id).order("started_at", { ascending: false }).limit(10),
  ]);

  if (!profile) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({ profile, subscription, usage, documents, quizAttempts });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await assertAdmin(supabase);
  if (error) return error;

  const body = await request.json();
  const update: Record<string, unknown> = {};
  if (typeof body.isSuspended === "boolean") update.is_suspended = body.isSuspended;
  if (body.role === "admin" || body.role === "user") update.role = body.role;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const { data, error: updateError } = await supabase.from("profiles").update(update).eq("id", id).select().single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ profile: data });
}
