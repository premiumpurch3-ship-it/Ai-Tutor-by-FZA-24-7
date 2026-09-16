import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

interface LogParams {
  userId?: string | null;
  scope: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort error logging visible in the Admin Panel. Uses the service
 * role client because regular users have no insert policy on system_errors
 * (see supabase/migrations/0002_rls.sql). Never throws — logging failures
 * must not break the calling request.
 */
export async function logSystemError(_userClient: SupabaseClient, params: LogParams) {
  try {
    const admin = createAdminClient();
    await admin.from("system_errors").insert({
      user_id: params.userId ?? null,
      scope: params.scope,
      message: params.message.slice(0, 2000),
      metadata: params.metadata ?? {},
    });
  } catch {
    // Swallow — logging must never crash the primary request path.
  }
}
