"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The top bar's page links. The current page is highlighted (and announced to screen readers);
// sub-pages such as /statements/pdf count as their section.
export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href) ? "page" : undefined}
          className={
            isActive(l.href)
              ? "-mx-2 rounded-md bg-blue-600/10 px-2 py-1 font-medium text-blue-700 dark:bg-blue-400/15 dark:text-blue-300"
              : "-mx-2 rounded-md px-2 py-1 opacity-80 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          }
        >
          {l.label}
        </Link>
      ))}
    </>
  );
}
