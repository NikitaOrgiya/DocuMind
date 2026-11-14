import { NextResponse } from "next/server";
import { getChatStore } from "@/lib/store";
import { readVisitorId } from "@/lib/visitor";

export async function GET() {
  try {
    const visitorId = await readVisitorId();
    if (!visitorId) return NextResponse.json({ sessions: [] });
    const sessions = await getChatStore().listSessions(visitorId);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить историю чатов." }, { status: 502 });
  }
}
