/**
 * Minimal structured logger. Never pass secrets, full prompts, or full
 * document contents through this — see the safelist discipline in each
 * call site instead of trying to redact after the fact.
 */
type LogEvent =
  | "rag.question_received"
  | "rag.retrieval_completed"
  | "rag.insufficient_context"
  | "rag.generation_failed"
  | "rag.citation_rejected"
  | "ingest.document_started"
  | "ingest.document_completed"
  | "ingest.embedding_failed"
  | "ingest.run_completed";

type LogFields = Record<string, string | number | boolean | null | undefined>;

function emit(level: "info" | "warn" | "error", event: LogEvent, fields?: LogFields) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: LogEvent, fields?: LogFields) => emit("info", event, fields),
  warn: (event: LogEvent, fields?: LogFields) => emit("warn", event, fields),
  error: (event: LogEvent, fields?: LogFields) => emit("error", event, fields),
};
