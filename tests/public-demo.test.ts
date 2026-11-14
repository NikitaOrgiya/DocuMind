import { afterEach, describe, expect, it, vi } from "vitest";
import { ModelUnavailableError, isUpstreamOfflineResponse } from "@/lib/ai/errors";
import { embedWithOllama, generateWithOllama, pingOllama } from "@/lib/ai/ollama-client";
import { FixedWindowLimiter, clientIp } from "@/lib/rate-limit";
import { InMemoryChatStore } from "@/lib/store/memory-store";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isUpstreamOfflineResponse", () => {
  it("treats gateway statuses and ngrok error pages as offline", () => {
    expect(isUpstreamOfflineResponse(502, "")).toBe(true);
    expect(isUpstreamOfflineResponse(503, "")).toBe(true);
    expect(isUpstreamOfflineResponse(504, "")).toBe(true);
    expect(isUpstreamOfflineResponse(404, "<html>ERR_NGROK_3200 endpoint is offline</html>")).toBe(true);
  });

  it("does not hide Ollama's own errors behind 'offline'", () => {
    expect(isUpstreamOfflineResponse(404, '{"error":"model \\"qwen3:4b\\" not found"}')).toBe(false);
    expect(isUpstreamOfflineResponse(401, "Unauthorized")).toBe(false);
    expect(isUpstreamOfflineResponse(500, "internal")).toBe(false);
  });
});

describe("ollama-client offline handling", () => {
  it("maps an unreachable host to ModelUnavailableError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(embedWithOllama("https://x.example", "m", ["q"])).rejects.toBeInstanceOf(ModelUnavailableError);
  });

  it("maps an offline tunnel page to ModelUnavailableError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ERR_NGROK_3200", { status: 404 })));
    await expect(generateWithOllama("https://x.example", "m", "q", "ctx")).rejects.toBeInstanceOf(
      ModelUnavailableError
    );
  });

  it("keeps a real Ollama error a plain Error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":"model not found"}', { status: 404 })));
    const error = await embedWithOllama("https://x.example", "m", ["q"]).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ModelUnavailableError);
  });

  it("sends the tunnel token only when one is configured", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ embeddings: [[0.1]] }));
    vi.stubGlobal("fetch", fetchMock);

    await embedWithOllama("https://x.example", "m", ["q"], "secret-token");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer secret-token");

    await embedWithOllama("http://127.0.0.1:11434", "m", ["q"]);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it("pingOllama reports offline instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(pingOllama("https://x.example")).resolves.toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ version: "0.12.0" })));
    await expect(pingOllama("https://x.example")).resolves.toBe(true);
  });
});

describe("FixedWindowLimiter", () => {
  it("allows up to the limit per key within the window, then resets", () => {
    const limiter = new FixedWindowLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("a", 10)).toBe(true);
    expect(limiter.take("a", 20)).toBe(false);
    expect(limiter.take("b", 20)).toBe(true);
    expect(limiter.take("a", 1001)).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("chat history is scoped to its visitor", () => {
  it("never returns another visitor's sessions", async () => {
    const store = new InMemoryChatStore();
    const mine = await store.createSession("my question", "visitor-a");
    await store.createSession("their question", "visitor-b");

    expect((await store.listSessions("visitor-a")).map((s) => s.id)).toEqual([mine.id]);
    expect(await store.getSession(mine.id, "visitor-b")).toBeNull();
    expect(await store.getSession(mine.id, "visitor-a")).not.toBeNull();
  });
});
