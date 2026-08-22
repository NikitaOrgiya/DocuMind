import "server-only";
import type { ChatMessageRecord, ChatSessionRecord, ChatSessionWithMessages } from "@/types/domain";
import type { ChatStore, NewMessage } from "./chat-store";
import { titleFromQuestion } from "./chat-store";

interface StoredSession {
  session: ChatSessionRecord;
  messages: ChatMessageRecord[];
}

/**
 * Process-memory chat store used when Supabase isn't configured (see
 * lib/config.ts `useMock`). History survives page reloads but not a dev
 * server restart — a real deployment always uses SupabaseChatStore instead.
 */
export class InMemoryChatStore implements ChatStore {
  readonly name = "in-memory";
  private sessions = new Map<string, StoredSession>();

  async createSession(firstQuestion: string): Promise<ChatSessionRecord> {
    const now = new Date().toISOString();
    const session: ChatSessionRecord = {
      id: crypto.randomUUID(),
      title: titleFromQuestion(firstQuestion),
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, { session, messages: [] });
    return session;
  }

  async getSession(id: string): Promise<ChatSessionWithMessages | null> {
    const entry = this.sessions.get(id);
    if (!entry) return null;
    return { ...entry.session, messages: entry.messages };
  }

  async listSessions(): Promise<ChatSessionRecord[]> {
    return [...this.sessions.values()]
      .map((e) => e.session)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async appendMessage(sessionId: string, message: NewMessage): Promise<ChatMessageRecord> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      throw new Error(`Unknown chat session: ${sessionId}`);
    }
    const record: ChatMessageRecord = {
      ...message,
      id: crypto.randomUUID(),
      sessionId,
      createdAt: new Date().toISOString(),
    };
    entry.messages.push(record);
    entry.session.updatedAt = record.createdAt;
    return record;
  }
}
