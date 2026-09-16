import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile, Subscription } from "@/types/database";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Use in Server Components/Pages that require auth (middleware also guards these routes). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireProfile(): Promise<{ profile: Profile; subscription: Subscription | null }> {
  const supabase = await createClient();
  const user = await requireUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: subscription } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();

  if (!profile) redirect("/login");
  if (profile.is_suspended) redirect("/login?error=Your account has been suspended. Contact support.");

  return { profile: profile as Profile, subscription: subscription as Subscription | null };
}

export async function requireAdmin() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}
