export type ChatRole = "user" | "assistant";

export interface SourceCard {
  /** Local, human-facing citation label such as "S1" — never a database UUID. */
  id: string;
  documentTitle: string;
  documentSource: string | null;
  section: string | null;
  pageNumber: number | null;
  excerpt: string;
  similarity: number;
}

export interface RetrievedChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  documentSource: string | null;
  content: string;
  section: string | null;
  pageNumber: number | null;
  similarity: number;
}

export type AnswerStatus = "answered" | "insufficient_context";

export interface StructuredAnswer {
  status: AnswerStatus;
  answer: string;
  citations: string[];
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  sources: SourceCard[];
  model: string | null;
  retrievalSuccess: boolean | null;
  createdAt: string;
}

export interface ChatSessionRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionWithMessages extends ChatSessionRecord {
  messages: ChatMessageRecord[];
}
