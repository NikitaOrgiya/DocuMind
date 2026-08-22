import { logger } from "@/lib/logging/logger";
import type { SourceCard, StructuredAnswer } from "@/types/domain";

export interface CitationValidationResult {
  /** Citations the model claimed AND that were actually retrieved. */
  validCitations: string[];
  /** Model-claimed citations that don't correspond to any retrieved source — never shown to the user. */
  rejectedCitations: string[];
  /** True once we've decided the answer is safe to show as a grounded "answered" response. */
  isGrounded: boolean;
}

/**
 * The model's citation IDs are never trusted directly. We intersect them
 * with the S-ids that retrieval actually produced for this question, and an
 * "answered" status with zero surviving citations is downgraded by the
 * caller — an ungrounded claim must never reach the user framed as grounded.
 */
export function validateCitations(
  answer: Pick<StructuredAnswer, "status" | "citations">,
  retrievedSources: SourceCard[]
): CitationValidationResult {
  const retrievedIds = new Set(retrievedSources.map((s) => s.id));
  const validCitations = answer.citations.filter((c) => retrievedIds.has(c));
  const rejectedCitations = answer.citations.filter((c) => !retrievedIds.has(c));

  if (rejectedCitations.length > 0) {
    logger.warn("rag.citation_rejected", {
      rejectedCount: rejectedCitations.length,
      claimedCount: answer.citations.length,
    });
  }

  const isGrounded = answer.status === "answered" && validCitations.length > 0;

  return { validCitations, rejectedCitations, isGrounded };
}
