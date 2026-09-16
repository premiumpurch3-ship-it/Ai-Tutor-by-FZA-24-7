import { describe, it, expect } from "vitest";
import { signUpSchema, chatMessageSchema, submitQuizSchema, generateQuizSchema } from "@/lib/validation/schemas";

describe("validation schemas", () => {
  it("rejects a signup with a short password", () => {
    const result = signUpSchema.safeParse({ email: "a@b.com", password: "short", fullName: "A" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid signup payload", () => {
    const result = signUpSchema.safeParse({ email: "a@b.com", password: "longenough123", fullName: "A" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty chat message", () => {
    const result = chatMessageSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a quiz submission with a malformed answer", () => {
    const result = submitQuizSchema.safeParse({ quizId: "not-a-uuid", answers: [] });
    expect(result.success).toBe(false);
  });

  it("defaults quiz difficulty to medium and clamps question count", () => {
    const result = generateQuizSchema.safeParse({ documentId: "11111111-1111-4111-8111-111111111111" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.difficulty).toBe("medium");
      expect(result.data.questionCount).toBe(5);
    }
  });

  it("rejects a question count above the max", () => {
    const result = generateQuizSchema.safeParse({ documentId: "11111111-1111-4111-8111-111111111111", questionCount: 999 });
    expect(result.success).toBe(false);
  });
});
