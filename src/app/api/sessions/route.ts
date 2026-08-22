import { NextResponse } from "next/server";
import { getChatStore } from "@/lib/store";

export async function GET() {
  try {
    const sessions = await getChatStore().listSessions();
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: "Unable to load chat history." }, { status: 502 });
  }
}
