// Small building blocks shared by the dashboards, so lists of money, statuses and form fields look
// the same everywhere. Server-safe (no client state).

// A number field with its unit inside the box and a short hint under it.
export function UnitInput(props: {
  name: string;
  label: string;
  unit: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{props.label}</span>
      <span className="mt-1.5 flex w-44 items-center overflow-hidden rounded-xl border border-[#e3e3de] bg-white focus-within:border-[#111111] focus-within:ring-[3px] focus-within:ring-black/[0.08]">
        <input
          type="number"
          name={props.name}
          min={props.min}
          max={props.max}
          step={props.step}
          defaultValue={props.defaultValue}
          className="w-full bg-transparent px-3 py-2 text-base tabular-nums outline-none"
        />
        <span className="shrink-0 border-l border-[#f0f0ec] bg-[#fbfbf9] px-3 py-2 text-sm text-[#7a7a75]">{props.unit}</span>
      </span>
      {props.hint && <span className="mt-1.5 block text-xs leading-relaxed opacity-60">{props.hint}</span>}
    </label>
  );
}

// A checkbox shown as a pill that lights up when ticked.
export function ChipCheckbox({ name, value, label, defaultChecked }: { name: string; value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-[#ecece8] bg-white px-3 py-1.5 text-sm text-[#4a4a46] transition-colors hover:border-[#cfcfc8] has-[:checked]:border-[#111111] has-[:checked]:bg-[#111111] has-[:checked]:text-white">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <svg viewBox="0 0 16 16" className="hidden h-3.5 w-3.5 peer-checked:block" aria-hidden>
        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </label>
  );
}

// A link to a Solana transaction, as a small pill.
export function TxLink({ href, label = "Solana" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#edf7ef] px-2.5 py-1 text-xs font-medium text-[#15803d] hover:bg-[#dff0e3]"
    >
      <span aria-hidden>✓</span>
      {label}
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
        <path d="M4 2h6v6M10 2L3 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </a>
  );
}

export type Status = "confirmed" | "simulated" | "failed" | "pending";
const STATUS_STYLE: Record<Status, { box: string; icon: string }> = {
  confirmed: { box: "bg-[#edf7ef] text-[#15803d]", icon: "✓" },
  simulated: { box: "bg-[#f4f4f1] text-[#5c5c57]", icon: "○" },
  failed: { box: "bg-[#fdecea] text-[#b42318]", icon: "✕" },
  pending: { box: "bg-[#fff4ec] text-[#c2410c]", icon: "…" },
};

// A status with an icon and its word (never colour alone).
export function StatusBadge({ status, label }: { status: string; label: string }) {
  const s = STATUS_STYLE[(status as Status) in STATUS_STYLE ? (status as Status) : "pending"];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${s.box}`}>
      <span aria-hidden>{s.icon}</span>
      {label}
    </span>
  );
}

export interface BarRow {
  key: string;
  label: React.ReactNode; // what the row is (a name, an hour)
  value: number; // drives the bar length
  amount: string; // the formatted value shown at the end
  sub?: React.ReactNode; // a quieter line under the label
  color?: string; // bar colour (CSS); default the accent
  trailing?: React.ReactNode; // e.g. a TxLink or a status badge
}

// Rows with a proportional bar: easy to compare at a glance, with the exact amount at the end.
export function BarList({ rows, total, totalLabel }: { rows: BarRow[]; total?: string; totalLabel?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  return (
    <div>
      {total && (
        <p className="flex items-baseline justify-between border-b border-[#f0f0ec] pb-2">
          <span className="text-[13px] text-[#7a7a75]">{totalLabel}</span>
          <span className="text-2xl font-semibold tracking-[-0.6px] tabular-nums">{total}</span>
        </p>
      )}
      <ul className="mt-1">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 border-b border-[#f6f6f3] py-2.5 last:border-0">
            <div className="w-36 shrink-0 text-sm">
              <div className="truncate">{r.label}</div>
              {r.sub && <div className="truncate text-xs opacity-60">{r.sub}</div>}
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0f0ec]">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color ?? "var(--viz-series-1)" }} />
            </div>
            <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">{r.amount}</span>
            {r.trailing !== undefined && <span className="flex w-24 shrink-0 justify-end gap-1">{r.trailing}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// A small headline number with its label.
export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "accent" }) {
  return (
    <div className={`rounded-[14px] border p-3.5 ${tone === "accent" ? "border-[#f6d9c2] bg-[#fff4ec]" : "border-[#f0f0ec] bg-[#fbfbf9]"}`}>
      <p className="text-xs text-[#7a7a75]">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-[-0.5px] tabular-nums ${tone === "accent" ? "text-[#c2410c]" : ""}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#7a7a75]">{sub}</p>}
    </div>
  );
}
