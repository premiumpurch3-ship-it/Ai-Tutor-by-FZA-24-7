import { describe, it, expect } from "vitest";
import { checkEntitlement } from "@/lib/usage/entitlements";

// Minimal fake Supabase query builder covering just the chains
// checkEntitlement() uses: .from(table).select().eq().single()/.maybeSingle()
function makeFakeSupabase(fixtures: {
  subscription?: { plan_id: string; status: string } | null;
  plan?: Record<string, unknown> | null;
  usage?: Record<string, number> | null;
}) {
  return {
    from(table: string) {
      const builder = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        async single() {
          if (table === "subscriptions") return { data: fixtures.subscription ?? null, error: fixtures.subscription ? null : new Error("not found") };
          if (table === "plans") return { data: fixtures.plan ?? null, error: fixtures.plan ? null : new Error("not found") };
          return { data: null, error: new Error("unexpected table") };
        },
        async maybeSingle() {
          if (table === "usage") return { data: fixtures.usage ?? null, error: null };
          return { data: null, error: null };
        },
      };
      return builder;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("checkEntitlement", () => {
  const freePlan = {
    id: "free",
    ai_messages_per_month: 30,
    documents_limit: 3,
    quiz_generations_per_month: 5,
    flashcard_generations_per_month: 5,
  };

  it("allows usage under the plan limit", async () => {
    const supabase = makeFakeSupabase({
      subscription: { plan_id: "free", status: "active" },
      plan: freePlan,
      usage: { ai_messages_used: 10 },
    });
    const result = await checkEntitlement(supabase, "user-1", "ai_messages");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(20);
  });

  it("blocks usage once the monthly limit is reached", async () => {
    const supabase = makeFakeSupabase({
      subscription: { plan_id: "free", status: "active" },
      plan: freePlan,
      usage: { ai_messages_used: 30 },
    });
    const result = await checkEntitlement(supabase, "user-1", "ai_messages");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("falls back to the free plan's limits when a paid subscription is canceled", async () => {
    const supabase = makeFakeSupabase({
      subscription: { plan_id: "pro", status: "canceled" },
      plan: freePlan, // effective plan resolves to "free" internally
      usage: { ai_messages_used: 25 },
    });
    const result = await checkEntitlement(supabase, "user-1", "ai_messages");
    expect(result.plan).toBe("free");
    expect(result.allowed).toBe(true); // 25 < 30
  });

  it("denies access when there is no subscription record at all", async () => {
    const supabase = makeFakeSupabase({ subscription: null });
    const result = await checkEntitlement(supabase, "user-1", "ai_messages");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("treats a user with no usage row yet as zero used", async () => {
    const supabase = makeFakeSupabase({
      subscription: { plan_id: "free", status: "active" },
      plan: freePlan,
      usage: null,
    });
    const result = await checkEntitlement(supabase, "user-1", "quiz_generations");
    expect(result.used).toBe(0);
    expect(result.allowed).toBe(true);
  });
});
