import { NextResponse } from "next/server";
import { getChatStore } from "@/lib/store";
import { answerQuestion } from "@/lib/rag/pipeline";
import { chatRequestSchema } from "@/lib/validation/question";
import { logger } from "@/lib/logging/logger";

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
    const session = sessionId
      ? await store.getSession(sessionId)
      : null;

    if (sessionId && !session) {
      return NextResponse.json({ error: "Диалог не найден." }, { status: 404 });
    }

    const activeSession = session ?? (await store.createSession(question));

    const userMessage = await store.appendMessage(activeSession.id, {
      role: "user",
      content: question,
      sources: [],
      model: null,
      retrievalSuccess: null,
    });

    const result = await answerQuestion(question);

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
    logger.error("rag.generation_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Не удалось получить ответ. Проверьте локальные сервисы (Ollama, Supabase) и попробуйте ещё раз." },
      { status: 502 }
    );
  }
}
