import { Sidebar } from "@/components/chat/sidebar";
import { useMock } from "@/lib/config";
import { getDocumentCount } from "@/lib/rag/manifest";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const documentCount = await getDocumentCount();

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar isMockMode={useMock} documentCount={documentCount} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
