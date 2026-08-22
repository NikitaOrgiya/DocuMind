/**
 * Normalizes raw document text before chunking: consistent line endings,
 * collapsed blank-line runs, and trimmed trailing whitespace per line.
 * Deliberately preserves Markdown heading markers (`#`) and paragraph
 * breaks — the chunker depends on both.
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
