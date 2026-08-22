import type { SourceCard } from "@/types/domain";

export interface GenerateInput {
  question: string;
  /** Rendered `<SOURCE>` markup, used by the real OpenAI provider as the user prompt. */
  context: string;
  /** The same sources in structured form, used by the mock provider directly. */
  sources: SourceCard[];
}

export interface GenerateResult {
  status: "answered" | "insufficient_context";
  answer: string;
  citations: string[];
  model: string;
}

export interface AIProvider {
  readonly name: string;
  embed(texts: string[]): Promise<number[][]>;
  generate(input: GenerateInput): Promise<GenerateResult>;
}
