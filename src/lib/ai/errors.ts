// No "server-only" guard: shared with the CLI scripts, like ollama-client.ts.

/**
 * The model host can't be reached right now — as opposed to a bug or a
 * misconfiguration. In the public demo the model runs on the developer's
 * own computer behind a tunnel, so "the computer is off" is a normal,
 * expected state that the UI explains instead of showing a generic error.
 */
export class ModelUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelUnavailableError";
  }
}

/**
 * True when an HTTP response came from the tunnel/gateway rather than from
 * Ollama itself: the tunnel is up but nothing is listening behind it
 * (ngrok answers with an `ERR_NGROK_*` page), or a gateway status says the
 * upstream is down. Ollama's own errors (e.g. 404 "model not found") are
 * NOT treated as "offline" — those are configuration problems.
 */
export function isUpstreamOfflineResponse(status: number, body: string): boolean {
  if (status === 502 || status === 503 || status === 504) return true;
  return /ERR_NGROK_\d+/.test(body);
}
