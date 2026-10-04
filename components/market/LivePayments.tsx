"use client";

import { StatusBadge, TxLink } from "@/components/ui/kit";
import type { LivePayment } from "@/lib/dashboard/livePayments";
import { useI18n } from "@/lib/i18n/client";

const explorer = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

// The latest hours' payments, newest first, under a heading per day. A line glows as it appears: the
// animation runs when the line is first added, so after a refresh only new hours light up.
export function LivePayments({
  items,
  direction,
}: {
  items: LivePayment[];
  direction: "received" | "paid";
}) {
  const { m, f } = useI18n();
  const t = m.livePayments;
  if (items.length === 0)
    return (
      <p className="mt-2 text-sm opacity-60">
        {direction === "received" ? t.noneReceived : t.nonePaid}
      </p>
    );
  return (
    <ul className="mt-2 max-h-[26rem] overflow-y-auto">
      <style>{`@keyframes kw-arrive{0%{opacity:0;transform:translateY(-6px);background:rgba(250,176,5,.35)}35%{opacity:1;transform:none}100%{background:transparent}}.kw-arrive{animation:kw-arrive 2.4s ease-out}`}</style>
      {items.flatMap((p, i) => {
        const names =
          p.counterparties.slice(0, 2).join(", ") +
          (p.counterparties.length > 2
            ? ` ${t.more(p.counterparties.length - 2)}`
            : "");
        const newDay =
          i === 0 || f.day(items[i - 1].periodStart) !== f.day(p.periodStart);
        return [
          newDay && (
            <li
              key={`day-${p.key}`}
              className="pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide opacity-50"
            >
              {f.day(p.periodStart)}
            </li>
          ),
          <li
            key={p.key}
            className="kw-arrive flex items-center gap-3 rounded-md border-b border-black/5 px-1 py-2 last:border-0 dark:border-white/10"
          >
            <span
              aria-hidden
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${direction === "received" ? "bg-green-600/15 text-green-800 dark:text-green-300" : "bg-blue-600/10 text-blue-800 dark:text-blue-300"}`}
            >
              {direction === "received" ? "↙" : "↗"}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-sm"
                title={p.counterparties.join(", ")}
              >
                {direction === "received" ? t.from(names) : t.to(names)}
              </span>
              <span className="block text-xs opacity-60">
                {f.time(p.periodStart)}–{f.time(p.periodStart + 3_600_000)}
              </span>
            </span>
            <span
              className={`text-sm font-semibold tabular-nums ${direction === "received" ? "text-green-700 dark:text-green-400" : ""}`}
            >
              {p.eur < 0.005
                ? `< ${f.eur(0.01)}` // a few Wh: would round to €0.00
                : `${direction === "received" ? "+" : "−"}${f.eur(p.eur)}`}
            </span>
            <span className="flex w-24 shrink-0 justify-end">
              {p.signature ? (
                <TxLink href={explorer(p.signature)} />
              ) : (
                <StatusBadge
                  status={p.status}
                  label={m.common.batchStatusShort[p.status] ?? p.status}
                />
              )}
            </span>
          </li>,
        ];
      })}
    </ul>
  );
}
