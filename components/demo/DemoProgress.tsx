"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DemoState, StepId } from "@/lib/demo/run";
import { useI18n } from "@/lib/i18n/client";
import { LiveRegion } from "./LiveRegion";

const STEPS: StepId[] = ["settings", "agents", "wallets", "ai", "simulate"];
const ICON: Record<string, string> = {
  waiting: "○",
  running: "◐",
  done: "✓",
  skipped: "–",
  failed: "✗",
};
const explorer = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

// Live progress of the one-click demo: the setup steps, then each simulated hour with its market
// price, what was paid, and the Solana transactions.
export function DemoProgress({ initial }: { initial: DemoState }) {
  const { m, f } = useI18n();
  const t = m.demo;
  const router = useRouter();
  const [state, setState] = useState(initial);
  const wasRunning = useRef(initial.running);

  useEffect(() => {
    if (!state.running) return;
    const timer = setInterval(async () => {
      const next = (await (
        await fetch("/api/demo", { cache: "no-store" })
      ).json()) as DemoState;
      setState(next);
      if (wasRunning.current && !next.running) router.refresh(); // pages and numbers now include the new day
      wasRunning.current = next.running;
    }, 1500);
    return () => clearInterval(timer);
  }, [state.running, router]);

  if (!state.startedAt) return null;
  const traded = state.hours.filter(
    (h) =>
      h.sharedKwh > 0.001 ||
      (h.neighboursInKwh ?? 0) + (h.neighboursOutKwh ?? 0) > 0.001,
  );
  return (
    <section
      className="mt-6 rounded-lg border border-black/10 p-5 dark:border-white/15"
      aria-live="polite"
    >
      <ol className="space-y-2 text-sm">
        {STEPS.map((id) => (
          <li key={id} className="flex gap-2">
            <span
              className={`w-4 text-center ${state.steps[id].status === "done" ? "text-green-700 dark:text-green-500" : ""}`}
            >
              {ICON[state.steps[id].status]}
            </span>
            <span>
              {t.steps[id]} ·{" "}
              <span className="opacity-70">
                {id === "ai" && state.steps[id].status === "skipped"
                  ? t.aiSkipped
                  : t.status[state.steps[id].status]}
              </span>
              {id === "simulate" && state.totalHours > 0 && (
                <span className="opacity-70">
                  {" "}
                  · {t.progress(state.hours.length, state.totalHours)}
                </span>
              )}
              {state.steps[id].detail &&
                state.steps[id].detail !== "ollama" && (
                  <span className="block text-xs opacity-70">
                    {state.steps[id].detail}
                  </span>
                )}
            </span>
          </li>
        ))}
      </ol>
      {!state.onChain && (
        <p className="mt-3 text-xs opacity-70">{t.offChain}</p>
      )}
      {state.error && (
        <p className="mt-3 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      {!state.running && !state.error && (
        <p className="mt-3 text-sm font-medium text-green-700 dark:text-green-500">
          {t.finished}
        </p>
      )}

      {state.communities && state.hours.length > 0 && (
        <LiveRegion
          communities={state.communities}
          hours={state.hours}
          running={state.running}
        />
      )}

      {traded.length > 0 && (
        <div className="mt-4 max-h-72 overflow-auto">
          <table className="kw-table w-full text-sm tabular-nums">
            <thead className="text-left text-xs opacity-70">
              <tr>
                <th className="py-1 font-normal">{t.table.hour}</th>
                <th className="py-1 text-right font-normal">
                  {t.table.shared}
                </th>
                <th className="py-1 text-right font-normal">{t.table.price}</th>
                <th className="py-1 text-right font-normal">
                  {t.table.neighbours}
                </th>
                <th className="py-1 text-right font-normal">{t.table.paid}</th>
                <th className="py-1 pl-4 font-normal">{t.table.tx}</th>
              </tr>
            </thead>
            <tbody>
              {traded.map((h) => (
                <tr
                  key={h.hourStart}
                  className="border-t border-black/5 dark:border-white/10"
                >
                  <td className="py-1">
                    {f.day(h.hourStart)} {f.time(h.hourStart)}
                  </td>
                  <td className="py-1 text-right">{f.kwh(h.sharedKwh, 2)}</td>
                  <td className="py-1 text-right">
                    {h.priceCt === null ? "–" : f.ct(h.priceCt)}
                  </td>
                  <td className="py-1 text-right text-xs">
                    {(h.neighboursInKwh ?? 0) + (h.neighboursOutKwh ?? 0) >
                    0.001
                      ? `↓ ${f.num(h.neighboursInKwh ?? 0)} · ↑ ${f.num(h.neighboursOutKwh ?? 0)}`
                      : "–"}
                  </td>
                  <td className="py-1 text-right">{f.eur(h.paidEur)}</td>
                  <td className="py-1 pl-4">
                    {h.signatures.length === 0
                      ? (m.common.batchStatus[h.status ?? ""] ?? "–")
                      : h.signatures.map((sig, i) => (
                          <a
                            key={sig}
                            href={explorer(sig)}
                            target="_blank"
                            rel="noreferrer"
                            className="mr-2 text-blue-700 underline dark:text-blue-400"
                          >
                            tx {i + 1} ↗
                          </a>
                        ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
