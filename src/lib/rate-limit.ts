// No "server-only" guard: pure logic, unit-tested directly.

/**
 * Fixed-window counters kept in process memory. On a serverless host each
 * instance counts on its own, so this is a guard against one visitor (or a
 * script) flooding the model running on the developer's computer — not an
 * exact global quota.
 */
export interface RateLimitRule {
  readonly limit: number;
  readonly windowMs: number;
}

export class FixedWindowLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly rule: RateLimitRule) {}

  /** Records a hit for `key`; returns false when the key is over its limit. */
  take(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.rule.windowMs });
      this.prune(now);
      return true;
    }
    if (entry.count >= this.rule.limit) return false;
    entry.count += 1;
    return true;
  }

  private prune(now: number) {
    if (this.hits.size < 1000) return;
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}

/** First address in `x-forwarded-for` (set by the hosting proxy), else "unknown". */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip") || "unknown";
}
