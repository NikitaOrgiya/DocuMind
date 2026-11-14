import { NextResponse } from "next/server";
import { ModelUnavailableError } from "@/lib/ai/errors";
import { logger } from "@/lib/logging/logger";
import { FixedWindowLimiter, clientIp } from "@/lib/rate-limit";
import { answerQuestion } from "@/lib/rag/pipeline";
import { getChatStore } from "@/lib/store";
import { chatRequestSchema } from "@/lib/validation/question";
import { getOrCreateVisitorId } from "@/lib/visitor";

// Generation on a CPU-only model can take minutes; see GENERATE_TIMEOUT_MS
// in lib/ai/ollama-client.ts, which stays below this ceiling.
export const maxDuration = 300;

// The demo model runs on one personal computer: keep any single visitor
// (or script) from queueing it up, and cap the total load as well.
const perVisitorLimiter = new FixedWindowLimiter({ limit: 8, windowMs: 10 * 60_000 });
const globalLimiter = new FixedWindowLimiter({ limit: 60, windowMs: 60 * 60_000 });

// Ollama on one CPU answers one question at a time, and an abandoned
// request keeps computing after a timeout (README "Known limitations"), so
// a second concurrent question would only queue behind the first and both
// would time out. Refuse it up front instead (per server instance).
const MAX_CONCURRENT_GENERATIONS = 1;
let generationsInFlight = 0;

const MODEL_OFFLINE_MESSAGE =
  "Демо-модель сейчас офлайн: она работает на компьютере разработчика и включена не всегда. Попробуйте позже — база знаний и интерфейс доступны и сейчас.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Тело запроса должно быть валидным JSON." }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Некорректный запрос." },
      { status: 400 }
    );
  }

  const { question, sessionId } = parsed.data;
  const store = getChatStore();

  try {
    const visitorId = await getOrCreateVisitorId();

    // Check the session before calling the model, so an invalid request
    // never costs a (slow) generation.
    const session = sessionId ? await store.getSession(sessionId, visitorId) : null;
    if (sessionId && !session) {
      return NextResponse.json({ error: "Диалог не найден." }, { status: 404 });
    }

    if (!perVisitorLimiter.take(clientIp(request.headers)) || !globalLimiter.take("all")) {
      return NextResponse.json(
        { error: "Слишком много вопросов подряд. Подождите несколько минут и попробуйте снова." },
        { status: 429 }
      );
    }

    if (generationsInFlight >= MAX_CONCURRENT_GENERATIONS) {
      return NextResponse.json(
        { error: "Модель сейчас отвечает на другой вопрос. Попробуйте через минуту." },
        { status: 429 }
      );
    }

    // Answer first, store after: a failed generation leaves no orphaned
    // question without an answer in the history.
    generationsInFlight += 1;
    let result: Awaited<ReturnType<typeof answerQuestion>>;
    try {
      result = await answerQuestion(question);
    } finally {
      generationsInFlight -= 1;
    }

    const activeSession = session ?? (await store.createSession(question, visitorId));

    const userMessage = await store.appendMessage(activeSession.id, {
      role: "user",
      content: question,
      sources: [],
      model: null,
      retrievalSuccess: null,
    });

    const assistantMessage = await store.appendMessage(activeSession.id, {
      role: "assistant",
      content: result.answer,
      sources: result.sources,
      model: result.model,
      retrievalSuccess: result.retrievalSuccess,
    });

    return NextResponse.json({
      session: { id: activeSession.id, title: activeSession.title },
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    if (error instanceof ModelUnavailableError) {
      logger.warn("rag.model_unavailable", { reason: error.message });
      return NextResponse.json({ error: MODEL_OFFLINE_MESSAGE, modelOffline: true }, { status: 503 });
    }
    logger.error("rag.generation_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Не удалось получить ответ. Попробуйте ещё раз чуть позже." },
      { status: 502 }
    );
  }
}
