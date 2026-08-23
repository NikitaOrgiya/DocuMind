// No "server-only" guard: shared with the CLI scripts (scripts/ingest,
// scripts/eval), matching the pattern already used by lib/rag/corpus.ts,
// chunk.ts, etc. Ollama needs no API key, so there's no secret here to
// guard against a client bundle — but this module is still only ever
// imported from server-only-guarded code or standalone CLI scripts, never
// from a "use client" component.
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/rag/prompt";
import { structuredAnswerSchema, type StructuredAnswerParsed } from "@/lib/validation/ai-response";

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["answered", "insufficient_context"] },
    answer: { type: "string" },
    citations: { type: "array", items: { type: "string" } },
  },
  required: ["status", "answer", "citations"],
} as const;

const EMBED_TIMEOUT_MS = 60_000;
const GENERATE_TIMEOUT_MS = 180_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama request to ${url} timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Real HTTP call to Ollama's /api/embed. No document content leaves the machine. */
export async function embedWithOllama(baseUrl: string, model: string, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetchWithTimeout(
    `${baseUrl}/api/embed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: texts }),
    },
    EMBED_TIMEOUT_MS
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama embedding request failed (${res.status} ${res.statusText}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { embeddings?: number[][] };
  if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length) {
    throw new Error(
      `Ollama embedding response shape mismatch: expected ${texts.length} vector(s), got ${data.embeddings?.length ?? 0}.`
    );
  }
  return data.embeddings;
}

export interface OllamaGenerateResult extends StructuredAnswerParsed {
  model: string;
}

/**
 * Real HTTP call to Ollama's /api/chat, using a JSON-schema `format` so the
 * output is grammar-constrained to the same shape OpenAI's structured
 * outputs produce — validated with the same Zod schema both providers
 * share, not a hand-rolled regex parser.
 *
 * qwen3 is a hybrid-thinking model: Ollama returns its reasoning in a
 * separate `message.thinking` field when present. That field is
 * deliberately never read here — only `message.content` (the
 * schema-constrained JSON) is parsed, so chain-of-thought never reaches
 * the answer, the UI, chat history, or logs.
 */
export async function generateWithOllama(
  baseUrl: string,
  model: string,
  question: string,
  context: string
): Promise<OllamaGenerateResult> {
  const res = await fetchWithTimeout(
    `${baseUrl}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(question, context) },
        ],
        format: RESPONSE_JSON_SCHEMA,
        stream: false,
        options: { temperature: 0 },
      }),
    },
    GENERATE_TIMEOUT_MS
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama chat request failed (${res.status} ${res.statusText}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const raw = data.message?.content;
  if (!raw) {
    throw new Error("Ollama chat response contained no content.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error(`Ollama chat response was not valid JSON: ${raw.slice(0, 300)}`);
  }

  const parsed = structuredAnswerSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(`Ollama chat response failed schema validation: ${parsed.error.message}`);
  }

  return { ...parsed.data, model };
}
