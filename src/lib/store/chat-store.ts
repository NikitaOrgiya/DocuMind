import type { ChatMessageRecord, ChatSessionRecord, ChatSessionWithMessages } from "@/types/domain";

export type NewMessage = Omit<ChatMessageRecord, "id" | "sessionId" | "createdAt">;

/**
 * Every session belongs to one anonymous visitor (`ownerId`, see
 * lib/visitor.ts): reads only ever return the caller's own sessions, so
 * visitors of the public demo never see each other's questions.
 */
export interface ChatStore {
  readonly name: string;
  createSession(firstQuestion: string, ownerId: string): Promise<ChatSessionRecord>;
  getSession(id: string, ownerId: string): Promise<ChatSessionWithMessages | null>;
  listSessions(ownerId: string): Promise<ChatSessionRecord[]>;
  appendMessage(sessionId: string, message: NewMessage): Promise<ChatMessageRecord>;
}

export function titleFromQuestion(question: string): string {
  const trimmed = question.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}
