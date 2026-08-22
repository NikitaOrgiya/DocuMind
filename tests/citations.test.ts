import { describe, expect, it } from "vitest";
import { validateCitations } from "@/lib/rag/citations";
import type { SourceCard } from "@/types/domain";

const sources: SourceCard[] = [
  { id: "S1", documentTitle: "Doc A", documentSource: null, section: "A", pageNumber: null, excerpt: "a", similarity: 0.9 },
  { id: "S2", documentTitle: "Doc B", documentSource: null, section: "B", pageNumber: null, excerpt: "b", similarity: 0.8 },
];

describe("validateCitations", () => {
  it("keeps citations that were actually retrieved and strips an unknown id (S99) the model invented", () => {
    const valid = validateCitations({ status: "answered", citations: ["S1", "S2"] }, sources);
    expect(valid.validCitations).toEqual(["S1", "S2"]);
    expect(valid.isGrounded).toBe(true);

    const withFake = validateCitations({ status: "answered", citations: ["S1", "S99"] }, sources);
    expect(withFake.validCitations).toEqual(["S1"]);
    expect(withFake.rejectedCitations).toEqual(["S99"]);
    expect(withFake.isGrounded).toBe(true);
  });

  it("is never grounded when zero valid citations survive, when status is insufficient_context, or when nothing was retrieved", () => {
    expect(validateCitations({ status: "answered", citations: ["S99"] }, sources).isGrounded).toBe(false);
    expect(validateCitations({ status: "insufficient_context", citations: ["S1"] }, sources).isGrounded).toBe(false);
    expect(validateCitations({ status: "answered", citations: ["S1"] }, []).isGrounded).toBe(false);
  });
});
