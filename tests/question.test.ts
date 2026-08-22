import { describe, expect, it } from "vitest";
import { chatRequestSchema, questionSchema } from "@/lib/validation/question";

describe("questionSchema", () => {
  it("rejects empty, whitespace-only, and over-length input", () => {
    expect(questionSchema.safeParse("").success).toBe(false);
    expect(questionSchema.safeParse("   \n\t  ").success).toBe(false);
    expect(questionSchema.safeParse("a".repeat(2001)).success).toBe(false);
  });

  it("accepts a well-formed question and trims surrounding whitespace", () => {
    const result = questionSchema.safeParse("  What is the backup schedule?  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("What is the backup schedule?");
  });
});

describe("chatRequestSchema", () => {
  it("allows an omitted sessionId but rejects a non-UUID one", () => {
    expect(chatRequestSchema.safeParse({ question: "A valid question" }).success).toBe(true);
    expect(
      chatRequestSchema.safeParse({ question: "A valid question", sessionId: "not-a-uuid" }).success
    ).toBe(false);
  });
});
