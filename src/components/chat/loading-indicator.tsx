"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const PHASE_TWO_DELAY_MS = 3000;

/**
 * Local qwen3:4b generation on CPU can take anywhere from a few seconds to
 * tens of seconds — long enough that a single static label starts to read
 * as "stuck". Switches to a second, still-honest phrase after a short
 * delay instead of a fake percentage or ETA, so the wait reads as "still
 * working" rather than frozen.
 */
export function LoadingIndicator() {
  const [phase, setPhase] = useState<1 | 2>(1);

  useEffect(() => {
    const timer = setTimeout(() => setPhase(2), PHASE_TWO_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {phase === 1 ? "Ищу в базе знаний…" : "Формирую ответ локальной моделью…"}
    </div>
  );
}
