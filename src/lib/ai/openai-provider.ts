import "server-only";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { config } from "@/lib/config";
import { logger } from "@/lib/logging/logger";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/rag/prompt";
import { structuredAnswerSchema } from "@/lib/validation/ai-response";
import type { AIProvider, GenerateInput, GenerateResult } from "./provider";

const responseFormat = zodResponseFormat(structuredAnswerSchema, "documind_answer");

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.client.embeddings.create({
      model: config.openai.embeddingModel,
      input: texts,
    });
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    try {
      const completion = await this.client.chat.completions.parse({
        model: config.openai.chatModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input.question, input.context) },
        ],
        response_format: responseFormat,
        temperature: 0,
      });

      const parsed = completion.choices[0]?.message.parsed;
      if (!parsed) {
        throw new Error("OpenAI response contained no parsed structured output.");
      }

      return { ...parsed, model: config.openai.chatModel };
    } catch (error) {
      logger.error("rag.generation_failed", {
        provider: this.name,
        reason: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    }
  }
}
