import { requireUser } from "@/lib/actions/current-user";
import { StudyPlanTasks } from "@/components/study-plans/plan-tasks";

export default async function StudyPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return <StudyPlanTasks planId={id} />;
}
