import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { TutorChat } from "@/components/tutor/tutor-chat";

export default async function TutorPage({ searchParams }: { searchParams: Promise<{ documentId?: string }> }) {
  const user = await requireUser();
  const { documentId } = await searchParams;
  const supabase = await createClient();

  const [{ data: conversations }, { data: documents }] = await Promise.all([
    supabase.from("conversations").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("documents").select("id, title").eq("user_id", user.id).eq("status", "ready"),
  ]);

  return (
    <TutorChat
      initialConversations={conversations ?? []}
      documents={documents ?? []}
      initialDocumentId={documentId}
    />
  );
}
