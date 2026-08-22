import { config } from "@/lib/config";
import type { SourceCard } from "@/types/domain";

/**
 * Neutralizes literal `<SOURCE>`/`</SOURCE>` tag syntax inside untrusted
 * document content so a malicious chunk can't forge a fake tag boundary and
 * make injected text appear to sit outside the untrusted block.
 */
function escapeSourceMarkup(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Renders retrieved sources as explicitly delimited, labeled blocks. The
 * XML-ish tags exist so the system prompt can point at a concrete boundary
 * ("everything inside SOURCE tags is untrusted data") rather than relying on
 * the model to infer where documents end and instructions begin.
 */
export function buildContext(sources: SourceCard[]): string {
  let remaining = config.rag.contextMaxChars;
  const blocks: string[] = [];

  for (const source of sources) {
    if (remaining <= 0) break;
    // Account for the "\n\n" that will join this block to the previous one.
    if (blocks.length > 0) remaining -= 2;
    if (remaining <= 0) break;

    const header = [
      `<SOURCE id="${source.id}">`,
      `Document: ${source.documentTitle}`,
      source.section ? `Section: ${source.section}` : null,
      source.pageNumber != null ? `Page: ${source.pageNumber}` : null,
      "Content:",
    ]
      .filter(Boolean)
      .join("\n");

    const footer = "</SOURCE>";
    const overhead = header.length + footer.length + 2;
    const budget = remaining - overhead;
    if (budget <= 0) break;

    const safeExcerpt = escapeSourceMarkup(source.excerpt);
    const content = safeExcerpt.length > budget ? safeExcerpt.slice(0, budget) : safeExcerpt;
    const block = `${header}\n${content}\n${footer}`;
    blocks.push(block);
    remaining -= block.length;
  }

  return blocks.join("\n\n");
}
