import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// config.ts resolves DOCUMIND_AI_PROVIDER at module-import time, so each
// case needs a fresh module instance under its own process.env — hence
// vi.resetModules() + dynamic import rather than a static top-level import.
describe("config.ts — provider selection", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("defaults to mock when DOCUMIND_AI_PROVIDER is unset", async () => {
    delete process.env.DOCUMIND_AI_PROVIDER;
    const { aiProvider, useMock } = await import("@/lib/config");
    expect(aiProvider).toBe("mock");
    expect(useMock).toBe(true);
  });

  it("throws a clear error for an invalid DOCUMIND_AI_PROVIDER value, instead of silently guessing", async () => {
    process.env.DOCUMIND_AI_PROVIDER = "bogus";
    await expect(import("@/lib/config")).rejects.toThrow(/Invalid DOCUMIND_AI_PROVIDER/);
  });

  it("assertRealProviderConfigured throws a clear error when ollama is selected without Supabase configured", async () => {
    process.env.DOCUMIND_AI_PROVIDER = "ollama";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { assertRealProviderConfigured } = await import("@/lib/config");
    expect(() => assertRealProviderConfigured()).toThrow(/requires a real Supabase backend/);
  });

  it("assertRealProviderConfigured throws a clear error when openai is selected without an API key", async () => {
    process.env.DOCUMIND_AI_PROVIDER = "openai";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    delete process.env.OPENAI_API_KEY;
    const { assertRealProviderConfigured } = await import("@/lib/config");
    expect(() => assertRealProviderConfigured()).toThrow(/OPENAI_API_KEY/);
  });

  it("assertRealProviderConfigured does not throw for a fully-configured ollama setup", async () => {
    process.env.DOCUMIND_AI_PROVIDER = "ollama";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    const { assertRealProviderConfigured } = await import("@/lib/config");
    expect(() => assertRealProviderConfigured()).not.toThrow();
  });

  it("never throws for mock, regardless of what else is configured", async () => {
    process.env.DOCUMIND_AI_PROVIDER = "mock";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.OPENAI_API_KEY;
    const { assertRealProviderConfigured } = await import("@/lib/config");
    expect(() => assertRealProviderConfigured()).not.toThrow();
  });

  it("EXPECTED_EMBEDDING_DIMENSIONS maps ollama to 768 and openai to 1536 — must match the pgvector migrations' vector(N)", async () => {
    const { EXPECTED_EMBEDDING_DIMENSIONS } = await import("@/lib/config");
    expect(EXPECTED_EMBEDDING_DIMENSIONS.ollama).toBe(768);
    expect(EXPECTED_EMBEDDING_DIMENSIONS.openai).toBe(1536);
  });
});
