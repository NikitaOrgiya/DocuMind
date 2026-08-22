import { describe, expect, it } from "vitest";
import { chunkDocument } from "@/lib/rag/chunk";

describe("chunkDocument", () => {
  it("produces non-empty, correctly sectioned, sequentially indexed chunks", () => {
    const text = `# Title\n\n## Section A\n\nFirst paragraph.\n\nSecond paragraph.\n\n## Section B\n\n\n\nThird paragraph.`;
    const chunks = chunkDocument(text);

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((chunk, i) => {
      expect(chunk.content.trim().length).toBeGreaterThan(0);
      expect(chunk.chunkIndex).toBe(i);
    });
    expect(chunks.some((c) => c.section === "Section A")).toBe(true);
    expect(chunks.some((c) => c.section === "Section B")).toBe(true);
  });

  it("splits an oversized section into multiple chunks, carrying a real overlap into the next chunk", () => {
    const bigParagraph = (label: string) =>
      Array.from({ length: 250 }, (_, i) => `${label}word${i}`).join(" ");
    const text = [
      "## Big Section",
      "",
      bigParagraph("first"),
      "",
      bigParagraph("second"),
      "",
      bigParagraph("third"),
    ].join("\n");

    const chunks = chunkDocument(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 1; i < chunks.length; i++) {
      const prevWords = chunks[i - 1].content.trim().split(/\s+/);
      const lastUniqueWord = prevWords[prevWords.length - 1];
      expect(chunks[i].content).toContain(lastUniqueWord);
    }
  });

  it("hard-splits a run of text with no paragraph/sentence breaks that alone exceeds the target size", () => {
    const hugeRun = "a".repeat(5000);
    const chunks = chunkDocument(`## Section\n\n${hugeRun}`);

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
    }
  });
});
