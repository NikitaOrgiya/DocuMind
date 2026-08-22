import { NextResponse } from "next/server";
import { getChatStore } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const session = await getChatStore().getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Unable to load chat session." }, { status: 502 });
  }
}
