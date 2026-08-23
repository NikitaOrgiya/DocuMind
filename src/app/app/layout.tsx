import { Sidebar } from "@/components/chat/sidebar";
import { useMock } from "@/lib/config";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar isMockMode={useMock} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
