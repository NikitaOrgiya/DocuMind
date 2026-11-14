import { NextResponse } from "next/server";
import { getChatStore } from "@/lib/store";
import { readVisitorId } from "@/lib/visitor";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const visitorId = await readVisitorId();
    const session = visitorId ? await getChatStore().getSession(id, visitorId) : null;
    if (!session) {
      return NextResponse.json({ error: "Диалог не найден." }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить диалог." }, { status: 502 });
  }
}
