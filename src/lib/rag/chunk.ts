export interface DocumentChunk {
  chunkIndex: number;
  section: string | null;
  content: string;
}

/** ~4 chars/token is the standard rough estimate for English text. */
const CHARS_PER_TOKEN = 4;
const TARGET_TOKENS = 800;
const OVERLAP_TOKENS = 130;
const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

interface Section {
  heading: string | null;
  content: string;
}

/** Splits Markdown into sections at `#`/`##`/`###` headings. */
function splitIntoSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content.length > 0) {
      sections.push({ heading: currentHeading, content });
    }
    buffer = [];
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[2].trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  return sections;
}

function splitIntoParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Sentence-boundary fallback for a single paragraph larger than the hard limit. */
function splitIntoSentences(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s+|$)/g);
  if (!sentences) return [paragraph];
  return sentences.map((s) => s.trim()).filter(Boolean);
}

/** Last-resort character hard-cut for a run of text with no sentence boundaries at all. */
function splitByCharLimit(text: string, limit: number): string[] {
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += limit) {
    pieces.push(text.slice(i, i + limit));
  }
  return pieces;
}

function takeOverlapTail(text: string): string {
  if (text.length <= OVERLAP_CHARS) return text;
  const tail = text.slice(-OVERLAP_CHARS);
  const spaceIndex = tail.indexOf(" ");
  return spaceIndex === -1 ? tail : tail.slice(spaceIndex + 1);
}

/**
 * Boundary-aware chunker: prefers heading boundaries, then paragraph
 * boundaries, then sentence boundaries, and only hard-cuts a chunk when a
 * single sentence exceeds the size limit on its own. Consecutive chunks
 * within the same section carry a trailing overlap so retrieval doesn't
 * lose context at a cut point.
 */
export function chunkDocument(normalizedText: string): DocumentChunk[] {
  const sections = splitIntoSections(normalizedText);
  const chunks: DocumentChunk[] = [];

  for (const section of sections) {
    const paragraphs = splitIntoParagraphs(section.content);
    let current = "";

    const pushChunk = (content: string) => {
      const trimmed = content.trim();
      if (trimmed.length === 0) return;
      chunks.push({ chunkIndex: chunks.length, section: section.heading, content: trimmed });
    };

    const addUnit = (unit: string) => {
      if (unit.length > TARGET_CHARS && current.length === 0) {
        // A single unit already exceeds the target on its own — hard-split by sentence.
        const sentences = splitIntoSentences(unit);
        const madeProgress = sentences.length > 1;
        for (const piece of madeProgress ? sentences : splitByCharLimit(unit, TARGET_CHARS)) {
          addUnit(piece);
        }
        return;
      }

      const candidate = current.length === 0 ? unit : `${current}\n\n${unit}`;
      if (candidate.length > TARGET_CHARS && current.length > 0) {
        pushChunk(current);
        current = takeOverlapTail(current) + "\n\n" + unit;
      } else {
        current = candidate;
      }
    };

    for (const paragraph of paragraphs) {
      addUnit(paragraph);
    }
    if (current.trim().length > 0) {
      pushChunk(current);
    }
  }

  return chunks;
}
