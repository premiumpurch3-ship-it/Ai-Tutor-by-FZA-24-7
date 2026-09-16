import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: plan } = await supabase.from("study_plans").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!plan) return NextResponse.json({ error: "Study plan not found." }, { status: 404 });

  const { data: tasks, error } = await supabase
    .from("study_tasks")
    .select("*")
    .eq("study_plan_id", id)
    .order("scheduled_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan, tasks });
}
