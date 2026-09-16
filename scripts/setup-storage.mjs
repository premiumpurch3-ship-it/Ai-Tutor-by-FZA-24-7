#!/usr/bin/env node
/**
 * Creates the private "documents" storage bucket used for uploaded study
 * material. Safe to re-run — skips if the bucket already exists.
 */
import "./_env.mjs";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: existing } = await admin.storage.getBucket("documents");
    if (existing) {
      console.log("Bucket 'documents' already exists.");
      return;
    }
  } catch {
    // Bucket doesn't exist yet — fall through to create it.
  }

  const { error } = await admin.storage.createBucket("documents", {
    public: false,
    fileSizeLimit: "20MB",
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
  });

  if (error) {
    console.error("Failed to create bucket:", error.message);
    process.exit(1);
  }

  console.log("Created private 'documents' storage bucket.");
  console.log("Note: access is enforced by your app (files are read via the server using the user's session), not by public bucket policies.");
}

main();
