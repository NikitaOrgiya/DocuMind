import "server-only";
import { cookies } from "next/headers";

/**
 * Anonymous per-browser id for the public demo. There are no accounts, so
 * without it every visitor would see every other visitor's chat history.
 * Stored in `chat_sessions.user_id` (the column the schema already
 * reserved for this) and checked on every read.
 */
export const VISITOR_COOKIE = "documind_visitor";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readVisitorId(): Promise<string | null> {
  const value = (await cookies()).get(VISITOR_COOKIE)?.value;
  return value && UUID_RE.test(value) ? value : null;
}

/** Route handlers only — Server Components can't set cookies. */
export async function getOrCreateVisitorId(): Promise<string> {
  const existing = await readVisitorId();
  if (existing) return existing;

  const id = crypto.randomUUID();
  (await cookies()).set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return id;
}
