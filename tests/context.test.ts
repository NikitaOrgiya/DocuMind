import { describe, expect, it } from "vitest";
import { buildContext } from "@/lib/rag/context";
import type { SourceCard } from "@/types/domain";

function source(overrides: Partial<SourceCard> = {}): SourceCard {
  return {
    id: "S1",
    documentTitle: "Backup and Recovery Runbook",
    documentSource: null,
    section: "Server restoration procedure",
    pageNumber: null,
    excerpt: "Confirm the scope of the failure before taking any restoration action.",
    similarity: 0.85,
    ...overrides,
  };
}

describe("buildContext", () => {
  it("wraps each source in a labeled SOURCE block with document/section/page metadata, in order", () => {
    const context = buildContext([source({ pageNumber: 12 }), source({ id: "S2", pageNumber: null })]);

    expect(context).toContain('<SOURCE id="S1">');
    expect(context).toContain("Document: Backup and Recovery Runbook");
    expect(context).toContain("Section: Server restoration procedure");
    expect(context).toContain("Page: 12");
    expect(context).toContain("</SOURCE>");
    expect(context.indexOf('id="S1"')).toBeLessThan(context.indexOf('id="S2"'));
  });

  it("never exceeds the configured RAG_CONTEXT_MAX_CHARS budget", () => {
    const manySources = Array.from({ length: 50 }, (_, i) =>
      source({ id: `S${i + 1}`, excerpt: "x".repeat(2000) })
    );
    expect(buildContext(manySources).length).toBeLessThanOrEqual(12000);
  });
});
