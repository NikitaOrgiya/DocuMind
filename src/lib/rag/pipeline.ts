import "server-only";
import { getAIProvider } from "@/lib/ai";
import { logger } from "@/lib/logging/logger";
import type { SourceCard } from "@/types/domain";
import { buildContext } from "./context";
import { validateCitations } from "./citations";
import { retrieveSources } from "./retrieval";

const INSUFFICIENT_CONTEXT_MESSAGE =
  "У меня недостаточно информации в доступных документах, чтобы ответить на этот вопрос.";

export interface AnswerResult {
  answer: string;
  sources: SourceCard[];
  retrievalSuccess: boolean;
  model: string | null;
}

/**
 * The single entry point for "question in, grounded answer out". Central
 * rule: if retrieval doesn't clear the similarity threshold, the chat model
 * is never called — refusal is a retrieval-layer decision, not something we
 * ask the model to volunteer.
 */
export async function answerQuestion(question: string): Promise<AnswerResult> {
  logger.info("rag.question_received", { length: question.length });

  const retrieval = await retrieveSources(question);
  logger.info("rag.retrieval_completed", {
    backend: retrieval.backend,
    matchCount: retrieval.sources.length,
  });

  if (!retrieval.isSufficient) {
    logger.info("rag.insufficient_context", { reason: "no_matches_above_threshold" });
    return {
      answer: INSUFFICIENT_CONTEXT_MESSAGE,
      sources: [],
      retrievalSuccess: false,
      model: null,
    };
  }

  const provider = getAIProvider();
  const context = buildContext(retrieval.sources);

  const generated = await provider.generate({
    question,
    context,
    sources: retrieval.sources,
  });

  const { validCitations, isGrounded } = validateCitations(generated, retrieval.sources);

  if (!isGrounded) {
    logger.info("rag.insufficient_context", { reason: "no_grounded_citations" });
    return {
      answer: INSUFFICIENT_CONTEXT_MESSAGE,
      sources: [],
      retrievalSuccess: false,
      model: generated.model,
    };
  }

  const citedSources = retrieval.sources.filter((s) => validCitations.includes(s.id));

  return {
    answer: generated.answer,
    sources: citedSources,
    retrievalSuccess: true,
    model: generated.model,
  };
}
