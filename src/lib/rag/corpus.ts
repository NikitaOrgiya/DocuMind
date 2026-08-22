// No "server-only" guard: shared with the CLI ingest script, which runs
// outside the Next.js server runtime. Importing this from a "use client"
// component would fail to build anyway, since `node:fs` doesn't exist in
// the browser.
import fs from "node:fs/promises";
import path from "node:path";

export interface CorpusDocument {
  slug: string;
  title: string;
  /** Repo-relative path, stored as `documents.file_path`. */
  filePath: string;
  rawText: string;
}

const CORPUS_DIR = path.join(process.cwd(), "docs", "sample-corpus");

/** Shared by scripts/ingest (real DB) and the in-memory mock backend, so both index identical documents. */
export async function loadCorpus(): Promise<CorpusDocument[]> {
  const entries = await fs.readdir(CORPUS_DIR);
  const files = entries.filter((f) => f.endsWith(".md")).sort();

  const docs: CorpusDocument[] = [];
  for (const file of files) {
    const rawText = await fs.readFile(path.join(CORPUS_DIR, file), "utf-8");
    const titleMatch = /^#\s+(.+)$/m.exec(rawText);
    const slug = file.replace(/\.md$/, "");
    docs.push({
      slug,
      title: titleMatch ? titleMatch[1].trim() : slug,
      filePath: `docs/sample-corpus/${file}`,
      rawText,
    });
  }
  return docs;
}
