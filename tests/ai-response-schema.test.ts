import { describe, expect, it } from "vitest";
import { structuredAnswerSchema } from "@/lib/validation/ai-response";

describe("structuredAnswerSchema", () => {
  it("accepts well-formed answered and insufficient_context responses", () => {
    expect(
      structuredAnswerSchema.safeParse({
        status: "answered",
        answer: "Backups are verified every Friday.",
        citations: ["S1", "S2"],
      }).success
    ).toBe(true);

    expect(
      structuredAnswerSchema.safeParse({
        status: "insufficient_context",
        answer: "I don't have enough information to answer this.",
        citations: [],
      }).success
    ).toBe(true);
  });

  it("rejects a malformed response: bad status, non-S<n> citation id, missing field, or non-array citations", () => {
    expect(
      structuredAnswerSchema.safeParse({ status: "maybe", answer: "Unclear.", citations: [] }).success
    ).toBe(false);
    expect(
      structuredAnswerSchema.safeParse({
        status: "answered",
        answer: "Answer.",
        citations: ["chunk-uuid-abc-123"],
      }).success
    ).toBe(false);
    expect(structuredAnswerSchema.safeParse({ status: "answered", citations: [] }).success).toBe(false);
    expect(
      structuredAnswerSchema.safeParse({ status: "answered", answer: "Answer.", citations: "S1" }).success
    ).toBe(false);
  });
});
