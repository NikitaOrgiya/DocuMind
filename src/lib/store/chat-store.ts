import type { ChatMessageRecord, ChatSessionRecord, ChatSessionWithMessages } from "@/types/domain";

export type NewMessage = Omit<ChatMessageRecord, "id" | "sessionId" | "createdAt">;

export interface ChatStore {
  readonly name: string;
  createSession(firstQuestion: string): Promise<ChatSessionRecord>;
  getSession(id: string): Promise<ChatSessionWithMessages | null>;
  listSessions(): Promise<ChatSessionRecord[]>;
  appendMessage(sessionId: string, message: NewMessage): Promise<ChatMessageRecord>;
}

export function titleFromQuestion(question: string): string {
  const trimmed = question.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}
