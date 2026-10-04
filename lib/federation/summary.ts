import { desc, like } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { PRICES } from "@/lib/config";
import { FEDERATION_PRICE_CT } from "./match";

// What actually happened with the neighbouring communities: energy each way, credits open, money
// settled, and the latest settlements on Solana.
export function federationSummary() {
  const flows = db.select().from(schema.federationFlows).all();
  const peers = db.select().from(schema.federationPeers).all();
  const per = new Map(peers.map((p) => [p.id, { importKwh: 0, exportKwh: 0, borrowedKwh: 0, lentKwh: 0, repaidKwh: 0, paidMicro: 0, receivedMicro: 0 }]));
  for (const f of flows) {
    const t = per.get(f.peerId);
    if (!t) continue;
    if (f.direction === "import") t.importKwh += f.kwh;
    else t.exportKwh += f.kwh;
    if (f.kind === "credit" && f.direction === "import") t.borrowedKwh += f.kwh;
    if (f.kind === "credit" && f.direction === "export") t.lentKwh += f.kwh;
    if (f.kind === "repay") t.repaidKwh += f.kwh;
    if (f.kind === "trade" || f.kind === "credit_settled") {
      const micro = Math.round(f.kwh * f.priceCt * 10_000);
      if (f.direction === "import") t.paidMicro += micro;
      else t.receivedMicro += micro;
    }
  }
  const importKwh = flows.filter((f) => f.direction === "import").reduce((s, f) => s + f.kwh, 0);
  const exportKwh = flows.filter((f) => f.direction === "export").reduce((s, f) => s + f.kwh, 0);
  const settlements = db
    .select()
    .from(schema.settlementTransfers)
    .where(like(schema.settlementTransfers.fromAccount, "federation:%"))
    .orderBy(desc(schema.settlementTransfers.id))
    .limit(12)
    .all();
  return {
    importKwh,
    exportKwh,
    savingEur: (importKwh * (PRICES.gridCt - FEDERATION_PRICE_CT)) / 100,
    extraEur: (exportKwh * (FEDERATION_PRICE_CT - PRICES.feedInCt)) / 100,
    perPeer: per,
    settlements,
    lastTs: flows.reduce((m, f) => Math.max(m, f.ts), 0) || null,
  };
}

// One day with the neighbours at a glance: per community, what went each way and how.
export function federationDay(dayStart: number, dayEnd: number) {
  const flows = db.select().from(schema.federationFlows).all().filter((f) => f.ts >= dayStart && f.ts < dayEnd);
  const out = new Map<string, { direction: "import" | "export"; kind: string; kwh: number; eur: number }[]>();
  for (const f of flows) {
    const list = out.get(f.peerId) ?? [];
    const same = list.find((x) => x.direction === f.direction && x.kind === f.kind);
    const eur = (f.kwh * f.priceCt) / 100;
    if (same) {
      same.kwh += f.kwh;
      same.eur += eur;
    } else list.push({ direction: f.direction, kind: f.kind, kwh: f.kwh, eur });
    out.set(f.peerId, list);
  }
  return out;
}
