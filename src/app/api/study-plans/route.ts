import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createStudyPlanSchema } from "@/lib/validation/schemas";
import { checkEntitlement, recordUsage } from "@/lib/usage/entitlements";
import { retrieveRelevantChunks } from "@/lib/ai/rag";
import { generateJSON } from "@/lib/ai/gemini";
import { logSystemError } from "@/lib/observability/log-error";

interface TaskAI {
  title: string;
  task_type: "study" | "revision" | "quiz";
  day_offset: number; // 0 = today
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: plans, error } = await supabase.from("study_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createStudyPlanSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const entitlement = await checkEntitlement(supabase, user.id, "ai_messages");
  if (!entitlement.allowed) {
    return NextResponse.json({ error: "You've reached your monthly AI usage limit. Upgrade your plan to continue." }, { status: 403 });
  }

  const { title, goal, examDate, hoursPerWeek, subjectId, documentId } = parsed.data;

  let context = "";
  if (documentId) {
    const chunks = await retrieveRelevantChunks(supabase, user.id, goal || title, { documentId, limit: 8 });
    context = chunks.map((c) => c.content).join("\n\n").slice(0, 8000);
  }

  const today = new Date();
  const daysUntilExam = examDate
    ? Math.max(3, Math.round((new Date(examDate).getTime() - today.getTime()) / 86_400_000))
    : 14;

  try {
    const result = await generateJSON<{ tasks: TaskAI[] }>(
      `Create a study plan spanning ${daysUntilExam} days for the goal: "${goal || title}".
Available study time: ${hoursPerWeek ?? 5} hours/week.
${context ? `Relevant material:\n${context}\n` : ""}
Include a realistic mix of study, revision, and quiz-practice tasks distributed across the days (do not put everything on day 0).
Respond with JSON: { "tasks": [{ "title": string, "task_type": "study"|"revision"|"quiz", "day_offset": number }] }. Limit to at most 40 tasks.`,
      "You are an expert study coach creating a realistic, well-paced study schedule."
    );
    if (!result.tasks || result.tasks.length === 0) throw new Error("The AI did not return any tasks.");

    const { data: plan, error: planError } = await supabase
      .from("study_plans")
      .insert({ user_id: user.id, subject_id: subjectId ?? null, title, goal: goal ?? null, exam_date: examDate ?? null, hours_per_week: hoursPerWeek ?? null })
      .select()
      .single();
    if (planError || !plan) throw new Error(planError?.message ?? "Failed to save study plan.");

    const rows = result.tasks.slice(0, 40).map((t) => {
      const date = new Date(today);
      date.setDate(date.getDate() + Math.max(0, t.day_offset));
      return {
        study_plan_id: plan.id,
        user_id: user.id,
        title: t.title,
        task_type: t.task_type,
        scheduled_date: date.toISOString().slice(0, 10),
      };
    });

    const { error: tasksError } = await supabase.from("study_tasks").insert(rows);
    if (tasksError) throw new Error(tasksError.message);

    await recordUsage(supabase, user.id, "ai_messages");
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate study plan.";
    await logSystemError(supabase, { userId: user.id, scope: "study_plan_generation", message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
