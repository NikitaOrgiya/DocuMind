import "server-only";
import { aiProvider, assertRealProviderConfigured } from "@/lib/config";
import { MockAIProvider } from "./mock-provider";
import { OllamaProvider } from "./ollama-provider";
import { OpenAIProvider } from "./openai-provider";
import type { AIProvider } from "./provider";

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!cached) {
    assertRealProviderConfigured();
    cached =
      aiProvider === "mock"
        ? new MockAIProvider()
        : aiProvider === "ollama"
          ? new OllamaProvider()
          : new OpenAIProvider();
  }
  return cached;
}

export type { AIProvider, GenerateInput, GenerateResult } from "./provider";
