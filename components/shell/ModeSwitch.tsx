"use client";

import { usePathname } from "next/navigation";
import type { AppMode } from "@/lib/mode";

// Product | Demo: the two copies of Volty. The current one is highlighted; the other opens the same
// page in the other copy (its own database and logins, so you may be asked to log in there).
export function ModeSwitch(props: { mode: AppMode; otherUrl: string; labels: { group: string; prod: string; demo: string } }) {
  const pathname = usePathname();
  const item = (m: AppMode, label: string) =>
    m === props.mode ? (
      <span
        aria-current="true"
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${
          m === "demo" ? "bg-[#fff4ec] text-[#c2410c]" : "bg-white text-[#111111]"
        }`}
      >
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${m === "demo" ? "bg-[#ff7a1a]" : "bg-[#16a34a]"}`} />
        {label}
      </span>
    ) : (
      <a href={`${props.otherUrl}${pathname}`} className="rounded-full px-2.5 py-1 text-[#5c5c57] hover:text-[#111111]">
        {label}
      </a>
    );
  return (
    <span role="group" aria-label={props.labels.group} className="flex items-center rounded-full bg-[#f4f4f1] p-0.5 text-xs">
      {item("prod", props.labels.prod)}
      {item("demo", props.labels.demo)}
    </span>
  );
}
