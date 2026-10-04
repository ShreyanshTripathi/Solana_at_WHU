import type { RejectionReason } from "@/lib/sites/decide";
import type { Format } from "./format";
import type { Messages } from "./messages";

// Words a stored rejection reason (a code and its facts) in the reader's language.
export function rejectionText(m: Messages, r: RejectionReason): string {
  switch (r.code) {
    case "unknown_meter":
      return m.site.reasons.unknown_meter();
    case "postcode_mismatch":
      return m.site.reasons.postcode_mismatch(r);
    case "outside_grid_area":
      return m.site.reasons.outside_grid_area(r);
  }
}

interface StoredDecision {
  ts: number;
  kind: string;
  params: Record<string, number | string>;
}

// Words one of the trading agent's logged decisions in the reader's language.
export function decisionText(d: StoredDecision, m: Messages, f: Format): string {
  const p = d.params as Record<string, number>;
  const t = m.agent.decisions;
  switch (d.kind) {
    case "battery_hold":
      return t.battery_hold(f.ct(p.priceNowCt), f.ct(p.bestLaterCt));
    case "battery_sell_now":
      return t.battery_sell_now(f.ct(p.priceNowCt), f.ct(p.bestLaterCt), f.kwh(p.ownNeedKwh));
    case "battery_keep":
      return t.battery_keep(f.kwh(p.ownNeedKwh), f.kwh(p.socKwh));
    case "battery_discharge":
      return t.battery_discharge(f.kwh(p.sellKwh, 2), f.ct(p.priceNowCt), f.kwh(p.ownNeedKwh));
    case "ev_plan":
      return t.ev_plan(f.kwh(p.needKwh), f.time(p.firstSlotTs), f.time(p.lastSlotTs + 15 * 60_000), f.eur(p.plannedCostEur), f.eur(p.asapCostEur), f.time(p.leavesAt));
    case "rules":
      return t.rules(
        String(d.params.fields)
          .split(",")
          .map((x) => m.agent.fields[x as keyof typeof m.agent.fields] ?? x)
          .join(", "),
      );
    default:
      return d.kind;
  }
}
