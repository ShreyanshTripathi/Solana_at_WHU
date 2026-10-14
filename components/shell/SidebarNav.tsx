"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

// The sidebar's links. The current page is highlighted (and announced to screen readers); sub-pages
// such as /statements/pdf count as their section.
export function SidebarNav({ groups, footer }: { groups: { title?: string; items: NavItem[] }[]; footer: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const link = (item: NavItem, small = false) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 ${small ? "text-[13px]" : "text-sm"} ${
        isActive(item.href) ? "bg-[#f4f4f1] font-semibold text-[#111111]" : "text-[#4a4a46] hover:bg-[#f7f7f5]"
      }`}
    >
      <Icon name={item.icon} />
      {item.label}
    </Link>
  );
  return (
    <>
      <nav aria-label="App" className="flex flex-col gap-0.5">
        {groups.map((g, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {g.title && <p className="mx-2.5 mb-1 mt-4 text-[11px] uppercase tracking-[0.6px] text-[#9a9a95]">{g.title}</p>}
            {g.items.map((item) => link(item))}
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5 pt-6">{footer.map((item) => link(item, true))}</div>
    </>
  );
}
