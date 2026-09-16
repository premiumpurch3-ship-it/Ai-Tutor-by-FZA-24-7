import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { taskId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: task } = await supabase.from("study_tasks").select("*").eq("id", taskId).eq("user_id", user.id).single();
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const isCompleted = !task.is_completed;
  const { data: updated, error } = await supabase
    .from("study_tasks")
    .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
    .eq("id", taskId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: updated });
}
