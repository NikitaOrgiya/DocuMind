import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type { ChatMessageRecord, ChatSessionRecord, ChatSessionWithMessages } from "@/types/domain";
import type { ChatStore, NewMessage } from "./chat-store";
import { titleFromQuestion } from "./chat-store";

interface SessionRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatMessageRecord["sources"] | null;
  model: string | null;
  retrieval_success: boolean | null;
  created_at: string;
}

function toSession(row: SessionRow): ChatSessionRecord {
  return { id: row.id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at };
}

function toMessage(row: MessageRow): ChatMessageRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    sources: row.sources ?? [],
    model: row.model,
    retrievalSuccess: row.retrieval_success,
    createdAt: row.created_at,
  };
}

export class SupabaseChatStore implements ChatStore {
  readonly name = "supabase";

  async createSession(firstQuestion: string, ownerId: string): Promise<ChatSessionRecord> {
    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from("chat_sessions")
      .insert({ title: titleFromQuestion(firstQuestion), user_id: ownerId })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create chat session: ${error?.message}`);
    }
    return toSession(data as SessionRow);
  }

  async getSession(id: string, ownerId: string): Promise<ChatSessionWithMessages | null> {
    const client = getSupabaseServerClient();
    const { data: sessionRow, error: sessionError } = await client
      .from("chat_sessions")
      .select()
      .eq("id", id)
      .eq("user_id", ownerId)
      .maybeSingle();

    if (sessionError) throw new Error(`Failed to load session: ${sessionError.message}`);
    if (!sessionRow) return null;

    const { data: messageRows, error: messagesError } = await client
      .from("chat_messages")
      .select()
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (messagesError) throw new Error(`Failed to load messages: ${messagesError.message}`);

    return {
      ...toSession(sessionRow as SessionRow),
      messages: ((messageRows ?? []) as MessageRow[]).map(toMessage),
    };
  }

  async listSessions(ownerId: string): Promise<ChatSessionRecord[]> {
    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from("chat_sessions")
      .select()
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to list sessions: ${error.message}`);
    return ((data ?? []) as SessionRow[]).map(toSession);
  }

  async appendMessage(sessionId: string, message: NewMessage): Promise<ChatMessageRecord> {
    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role: message.role,
        content: message.content,
        sources: message.sources,
        model: message.model,
        retrieval_success: message.retrievalSuccess,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to append chat message: ${error?.message}`);
    }

    await client
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return toMessage(data as MessageRow);
  }
}
