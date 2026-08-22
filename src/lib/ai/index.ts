import "server-only";
import { useMock } from "@/lib/config";
import { MockAIProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";
import type { AIProvider } from "./provider";

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!cached) {
    cached = useMock ? new MockAIProvider() : new OpenAIProvider();
  }
  return cached;
}

export type { AIProvider, GenerateInput, GenerateResult } from "./provider";
