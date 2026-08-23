import "server-only";
import { config } from "@/lib/config";
import { logger } from "@/lib/logging/logger";
import { embedWithOllama, generateWithOllama } from "./ollama-client";
import type { AIProvider, GenerateInput, GenerateResult } from "./provider";

/** Real local generation + embeddings via Ollama — no external API calls, no API key. */
export class OllamaProvider implements AIProvider {
  readonly name = "ollama";

  async embed(texts: string[]): Promise<number[][]> {
    return embedWithOllama(config.ollama.baseUrl, config.ollama.embeddingModel, texts);
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    try {
      return await generateWithOllama(
        config.ollama.baseUrl,
        config.ollama.chatModel,
        input.question,
        input.context
      );
    } catch (error) {
      logger.error("rag.generation_failed", {
        provider: this.name,
        reason: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    }
  }
}
