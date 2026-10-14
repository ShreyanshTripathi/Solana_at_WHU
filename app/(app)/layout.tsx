import { Sidebar } from "@/components/shell/Sidebar";

// The app: the sidebar on the left, the page on a soft off-white ground.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbf9] md:flex-row">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
