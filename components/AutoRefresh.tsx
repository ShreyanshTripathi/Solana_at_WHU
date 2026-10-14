"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

// Keeps a dashboard current. It asks the server every few seconds whether anything new was
// metered or settled, and redraws only then: once every 15 minutes in real use, every few
// seconds while the live demo runs through a day.
// `since` is the fingerprint the page was drawn with, so a change that lands between drawing the page
// and the first check still triggers a redraw.
export function AutoRefresh({
  since,
  everyMs = 3000,
}: {
  since: string;
  everyMs?: number;
}) {
  const router = useRouter();
  const { m } = useI18n();
  const last = useRef(since);
  const [live, setLive] = useState(false);
  useEffect(() => {
    last.current = since; // a redraw brings the new fingerprint
  }, [since]);
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const { key, running } = (await res.json()) as {
          key: string;
          running: boolean;
        };
        if (stopped) return;
        setLive(running);
        if (key !== last.current) router.refresh();
        last.current = key;
      } catch {
        // offline for a moment: try again on the next tick
      }
    };
    void check();
    const timer = setInterval(check, everyMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [router, everyMs]);
  return live ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#f6d9c2] bg-[#fff4ec] px-3 py-1 text-xs font-semibold text-[#c2410c]">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff7a1a]" aria-hidden />
      {m.common.live}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#ecece8] bg-white px-3 py-1 text-xs text-[#5c5c57]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" aria-hidden />
      {m.common.autoRefresh}
    </span>
  );
}
