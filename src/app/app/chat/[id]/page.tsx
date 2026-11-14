import { notFound } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { getChatStore } from "@/lib/store";
import { readVisitorId } from "@/lib/visitor";

export default async function ChatSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorId = await readVisitorId();
  const session = visitorId ? await getChatStore().getSession(id, visitorId) : null;

  if (!session) {
    notFound();
  }

  return <ChatView sessionId={session.id} initialMessages={session.messages} />;
}
