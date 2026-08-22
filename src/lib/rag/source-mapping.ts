import type { SourceCard } from "@/types/domain";
import type { BackendMatch } from "./backend";

/**
 * Assigns local S1..SN citation labels in the order matches were returned
 * (i.e. similarity-ranked). These labels — never the underlying database
 * UUID — are what the model is allowed to cite back.
 */
export function mapMatchesToSources(matches: BackendMatch[]): SourceCard[] {
  return matches.map((match, index) => ({
    id: `S${index + 1}`,
    documentTitle: match.documentTitle,
    documentSource: match.documentSource,
    section: match.section,
    pageNumber: match.pageNumber,
    excerpt: match.content,
    similarity: match.similarity,
  }));
}
