import { describe, expect, it } from "vitest";
import type { BackendMatch } from "@/lib/rag/backend";
import { mapMatchesToSources } from "@/lib/rag/source-mapping";

function match(overrides: Partial<BackendMatch> = {}): BackendMatch {
  return {
    id: "chunk-uuid-123",
    documentId: "doc-uuid-456",
    documentTitle: "Access Management Policy",
    documentSource: "docs/sample-corpus/access-management-policy.md",
    content: "Privileged access must be reviewed at least every 90 days.",
    section: "Privileged access",
    pageNumber: null,
    similarity: 0.91,
    ...overrides,
  };
}

describe("mapMatchesToSources", () => {
  it("assigns sequential S1..SN labels in ranked order and never leaks the underlying database uuid", () => {
    const sources = mapMatchesToSources([match(), match({ similarity: 0.8 }), match({ similarity: 0.75 })]);
    expect(sources.map((s) => s.id)).toEqual(["S1", "S2", "S3"]);
    expect(sources[0].id).not.toBe("chunk-uuid-123");
  });

  it("preserves document metadata and similarity, and handles zero matches", () => {
    const [source] = mapMatchesToSources([match()]);
    expect(source.documentTitle).toBe("Access Management Policy");
    expect(source.section).toBe("Privileged access");
    expect(source.similarity).toBe(0.91);
    expect(mapMatchesToSources([])).toEqual([]);
  });
});
