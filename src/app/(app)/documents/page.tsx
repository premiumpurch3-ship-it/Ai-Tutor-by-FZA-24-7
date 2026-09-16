import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { DocumentUploader } from "@/components/documents/uploader";
import { DocumentList } from "@/components/documents/document-list";

export default async function DocumentsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: documents }, { data: subjects }] = await Promise.all([
    supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("subjects").select("*").eq("user_id", user.id).order("created_at"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Documents</h1>
        <p className="text-sm text-white/50">Upload study material to power your AI tutor, quizzes, and flashcards.</p>
      </div>
      <DocumentUploader subjects={subjects ?? []} />
      <DocumentList initialDocuments={documents ?? []} />
    </div>
  );
}
