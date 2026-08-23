import "server-only";
import { assertRealProviderConfigured, useMock } from "@/lib/config";
import type { ChatStore } from "./chat-store";
import { InMemoryChatStore } from "./memory-store";
import { SupabaseChatStore } from "./supabase-store";

declare global {
  var __documindChatStore: ChatStore | undefined;
}

export function getChatStore(): ChatStore {
  if (!globalThis.__documindChatStore) {
    assertRealProviderConfigured();
    globalThis.__documindChatStore = useMock ? new InMemoryChatStore() : new SupabaseChatStore();
  }
  return globalThis.__documindChatStore;
}

export type { ChatStore, NewMessage } from "./chat-store";
