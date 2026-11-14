// No "server-only" guard: shared with the CLI scripts (scripts/ingest,
// scripts/eval), matching the pattern already used by lib/rag/corpus.ts,
// chunk.ts, etc. Ollama needs no API key, so there's no secret here to
// guard against a client bundle — but this module is still only ever
// imported from server-only-guarded code or standalone CLI scripts, never
// from a "use client" component.
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/rag/prompt";
import { structuredAnswerSchema, type StructuredAnswerParsed } from "@/lib/validation/ai-response";
import { ModelUnavailableError, isUpstreamOfflineResponse } from "./errors";

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
// CPU generation time scales with retrieved context size (up to
// RAG_MATCH_COUNT chunks). Measured eval runs averaged ~18s/case, but a
// live demo question that legitimately retrieves close to the full 6-chunk
// cap was observed taking >180s under system load — bumped to 5 minutes
// so a genuinely slow-but-working request isn't cut off prematurely; this
// is a network safety ceiling, not a target latency.
// Kept below the chat route's `maxDuration` (300s) so a slow answer fails
// with a clear "model unavailable" message instead of the platform killing
// the function mid-request.
const GENERATE_TIMEOUT_MS = 240_000;

/**
 * Headers for every Ollama call. `authToken` is only set when Ollama sits
 * behind a tunnel that requires it (the public demo — see README "Public
 * demo"); a plain local `ollama serve` needs none. The ngrok header skips
 * ngrok's browser-warning page, which would otherwise replace the JSON
 * response; Ollama ignores it.
 */
function ollamaHeaders(authToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "1",
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

async function failForResponse(res: Response, what: string): Promise<never> {
  const body = await res.text().catch(() => "");
  if (isUpstreamOfflineResponse(res.status, body)) {
    throw new ModelUnavailableError(`Ollama host is offline (${what}: ${res.status}).`);
  }
  throw new Error(`Ollama ${what} request failed (${res.status} ${res.statusText}): ${body.slice(0, 300)}`);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ModelUnavailableError(`Ollama request to ${url} timed out after ${timeoutMs}ms.`);
    }
    // fetch() rejects (TypeError) only when no HTTP response arrived at
    // all — DNS, refused connection, tunnel down: the host is unreachable.
    if (error instanceof TypeError) {
      throw new ModelUnavailableError(`Ollama host ${url} is unreachable: ${error.message}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Real HTTP call to Ollama's /api/embed. No document content leaves the machine. */
export async function embedWithOllama(
  baseUrl: string,
  model: string,
  texts: string[],
  authToken?: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetchWithTimeout(
    `${baseUrl}/api/embed`,
    {
      method: "POST",
      headers: ollamaHeaders(authToken),
      body: JSON.stringify({ model, input: texts }),
    },
    EMBED_TIMEOUT_MS
  );

  if (!res.ok) await failForResponse(res, "embedding");

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
  context: string,
  authToken?: string
): Promise<OllamaGenerateResult> {
  const res = await fetchWithTimeout(
    `${baseUrl}/api/chat`,
    {
      method: "POST",
      headers: ollamaHeaders(authToken),
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

  if (!res.ok) await failForResponse(res, "chat");

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

/**
 * Cheap reachability check for the status banner: Ollama's /api/version
 * answers instantly without loading a model.
 */
export async function pingOllama(baseUrl: string, authToken?: string, timeoutMs = 4_000): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/version`, { method: "GET", headers: ollamaHeaders(authToken) }, timeoutMs);
    return res.ok;
  } catch {
    return false;
  }
}
