import { SiteFooter, SiteHeader } from "@/components/shell/SiteHeader";

// Public pages: a white page with the top bar and footer.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
