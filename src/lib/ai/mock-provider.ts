import { stemmer } from "stemmer";
import { MOCK_EMBEDDING_DIMENSIONS } from "@/lib/config";
import type { AIProvider, GenerateInput, GenerateResult } from "./provider";

/**
 * Deterministic local stand-in for OpenAI, used when real credentials are
 * absent (see lib/config.ts `useMock`). It is NOT a language model: `embed`
 * is a hashed bag-of-words vector and `generate` is rule-based extraction
 * from the top retrieved sources. It exists so the full RAG pipeline —
 * retrieval, grounding, refusal, citation validation — is exercisable end
 * to end without any external API. Never selected while real credentials
 * are configured (see lib/config.ts).
 */
export const MOCK_MODEL_NAME = "documind-mock-v1";

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Common English function words. Without filtering these, an unrelated
 * question and an unrelated document chunk still share enough of "what /
 * is / the / a / are / how / for" to clear a low similarity threshold —
 * defeating refusal on out-of-scope questions. Only content-bearing words
 * should drive the mock's notion of "relevant".
 */
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "what", "when", "where", "who", "whom", "which", "why", "how",
  "do", "does", "did", "doing", "of", "in", "on", "at", "to", "for",
  "with", "about", "against", "between", "into", "through", "during",
  "before", "after", "above", "below", "from", "up", "down", "and",
  "or", "but", "if", "so", "than", "that", "this", "these", "those",
  "it", "its", "as", "by", "can", "could", "should", "would", "will",
  "shall", "may", "might", "must", "not", "no", "there",
  "here", "i", "you", "he", "she", "we", "they", "them", "their",
  "our", "your", "my", "his", "her", "have", "has", "had", "having",
]);

/**
 * Stemming ("restoring"/"restoration"/"restored" -> "restor") matters more
 * here than in a typical bag-of-words model: with no true semantic
 * understanding, an unstemmed mock would only match a question that reuses
 * a document's exact word forms.
 */
function tokenize(text: string): string[] {
  const all = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return all.filter((token) => !STOPWORDS.has(token)).map(stemmer);
}

function mockEmbed(text: string): number[] {
  const vector = new Array<number>(MOCK_EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    vector[hashToken(token) % MOCK_EMBEDDING_DIMENSIONS] += 1;
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]}_${tokens[i + 1]}`;
    vector[hashToken(bigram) % MOCK_EMBEDDING_DIMENSIONS] += 0.5;
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

const MIN_MEANINGFUL_SENTENCE_LENGTH = 40;

function wordBoundarySlice(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

/**
 * Takes the excerpt's first sentence, unless it's implausibly short — e.g. a
 * numbered-list marker like "1." reads as a "sentence" to a naive
 * period-splitter — in which case it falls back to a clean word-boundary
 * slice instead.
 */
function firstSentenceOrSlice(text: string, maxChars: number): string {
  const trimmed = text.trim();
  const match = /^[^.!?]+[.!?]/.exec(trimmed);
  const candidate = match?.[0] ?? trimmed;

  if (candidate.length < MIN_MEANINGFUL_SENTENCE_LENGTH) {
    return wordBoundarySlice(trimmed, maxChars);
  }
  return candidate.length > maxChars ? wordBoundarySlice(candidate, maxChars) : candidate;
}

export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(mockEmbed);
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    if (input.sources.length === 0) {
      return {
        status: "insufficient_context",
        answer:
          "I don't have enough information in the available documents to answer this question.",
        citations: [],
        model: MOCK_MODEL_NAME,
      };
    }

    const top = input.sources.slice(0, 2);
    const sentences = top.map(
      (source) => `${firstSentenceOrSlice(source.excerpt, 280)} [${source.id}]`
    );

    return {
      status: "answered",
      answer: sentences.join(" "),
      citations: top.map((s) => s.id),
      model: MOCK_MODEL_NAME,
    };
  }
}
