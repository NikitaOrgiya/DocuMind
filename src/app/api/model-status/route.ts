import { NextResponse } from "next/server";
import { pingOllama } from "@/lib/ai/ollama-client";
import { config } from "@/lib/config";

/**
 * Whether the model can answer right now. Only meaningful for the Ollama
 * provider, where the model may run on a computer that is switched off
 * (public demo); mock and OpenAI are always reported online.
 */
export async function GET() {
  if (config.aiProvider !== "ollama") {
    return NextResponse.json({ online: true });
  }
  const online = await pingOllama(config.ollama.baseUrl, config.ollama.authToken);
  return NextResponse.json({ online }, { headers: { "Cache-Control": "no-store" } });
}
