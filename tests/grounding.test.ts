import { beforeEach, describe, expect, it, vi } from "vitest";
import { answerQuestion } from "@/lib/rag/pipeline";
import type { SourceCard } from "@/types/domain";

const { generateMock, retrieveSourcesMock } = vi.hoisted(() => ({
  generateMock: vi.fn(),
  retrieveSourcesMock: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  getAIProvider: () => ({ name: "test-provider", embed: vi.fn(), generate: generateMock }),
}));

vi.mock("@/lib/rag/retrieval", () => ({
  retrieveSources: retrieveSourcesMock,
}));

function source(overrides: Partial<SourceCard> = {}): SourceCard {
  return {
    id: "S1",
    documentTitle: "Doc",
    documentSource: null,
    section: "Section",
    pageNumber: null,
    excerpt: "Some retrieved content.",
    similarity: 0.9,
    ...overrides,
  };
}

describe("answerQuestion (RAG grounding gate)", () => {
  beforeEach(() => {
    generateMock.mockReset();
    retrieveSourcesMock.mockReset();
  });

  it("never calls the chat model when retrieval finds nothing above threshold", async () => {
    retrieveSourcesMock.mockResolvedValue({ sources: [], isSufficient: false, backend: "test" });

    const result = await answerQuestion("What is the price of a unicorn?");

    expect(generateMock).not.toHaveBeenCalled();
    expect(result.retrievalSuccess).toBe(false);
    expect(result.sources).toEqual([]);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("calls the chat model and returns a grounded answer when retrieval succeeds with valid citations", async () => {
    retrieveSourcesMock.mockResolvedValue({ sources: [source()], isSufficient: true, backend: "test" });
    generateMock.mockResolvedValue({
      status: "answered",
      answer: "The answer, grounded in S1.",
      citations: ["S1"],
      model: "test-model",
    });

    const result = await answerQuestion("A real question about the docs");

    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(result.retrievalSuccess).toBe(true);
    expect(result.sources.map((s) => s.id)).toEqual(["S1"]);
  });

  it("downgrades to a refusal when the model answers but every citation it claims is invalid", async () => {
    retrieveSourcesMock.mockResolvedValue({ sources: [source()], isSufficient: true, backend: "test" });
    generateMock.mockResolvedValue({
      status: "answered",
      answer: "An ungrounded claim.",
      citations: ["S99"],
      model: "test-model",
    });

    const result = await answerQuestion("A real question about the docs");

    expect(result.retrievalSuccess).toBe(false);
    expect(result.sources).toEqual([]);
  });
});
