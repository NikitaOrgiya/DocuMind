import { notFound } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { getChatStore } from "@/lib/store";

export default async function ChatSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getChatStore().getSession(id);

  if (!session) {
    notFound();
  }

  return <ChatView sessionId={session.id} initialMessages={session.messages} />;
}
