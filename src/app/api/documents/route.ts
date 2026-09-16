import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkDocumentLimit } from "@/lib/usage/entitlements";
import { extractText } from "@/lib/documents/extract";
import { chunkText } from "@/lib/documents/chunk";
import { logSystemError } from "@/lib/observability/log-error";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitCheck = await checkDocumentLimit(supabase, user.id);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Document limit reached for your plan (${limitCheck.limit}). Upgrade to upload more.` },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const title = (formData.get("title") as string) || "Untitled document";
  const subjectId = (formData.get("subjectId") as string) || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds the 20MB limit." }, { status: 400 });
  }
  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json({ error: "Unsupported file type. Upload a PDF, DOCX, or TXT file." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      title,
      file_path: storagePath,
      file_type: fileType,
      file_size_bytes: file.size,
      status: "processing",
    })
    .select()
    .single();

  if (insertError || !doc) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to create document record." }, { status: 500 });
  }

  // Process inline (extract -> chunk -> store). For very large files in a
  // real deployment, move this to a background queue (see SETUP.md notes).
  try {
    const { text, pageCount } = await extractText(buffer, fileType);
    if (!text || text.trim().length < 20) {
      throw new Error("Could not extract readable text from this file.");
    }

    const chunks = chunkText(text);
    const { error: chunksError } = await supabase.from("document_chunks").insert(
      chunks.map((c) => ({
        document_id: doc.id,
        user_id: user.id,
        chunk_index: c.index,
        content: c.content,
        token_estimate: c.tokenEstimate,
      }))
    );
    if (chunksError) throw new Error(chunksError.message);

    await supabase
      .from("documents")
      .update({ status: "ready", page_count: pageCount ?? null })
      .eq("id", doc.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown processing error.";
    await supabase.from("documents").update({ status: "error", error_message: message }).eq("id", doc.id);
    await logSystemError(supabase, { userId: user.id, scope: "document_processing", message, metadata: { documentId: doc.id } });
  }

  const { data: finalDoc } = await supabase.from("documents").select("*").eq("id", doc.id).single();
  return NextResponse.json({ document: finalDoc });
}
