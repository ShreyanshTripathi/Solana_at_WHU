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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/10 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
      <span
        className="h-2 w-2 animate-pulse rounded-full bg-red-600"
        aria-hidden
      />
      {m.common.live}
    </span>
  ) : (
    <span className="text-xs opacity-60">{m.common.autoRefresh}</span>
  );
}
