import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, eq, gte, like, lt } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { MICRO_PER_CT } from "@/lib/config";
import { GRID } from "@/lib/ledger/ledger";
import { flowsIn } from "@/lib/federation/run";
import { buildRecord, publicCode, type PublicRecord } from "./record";

const { allocations, ledgerEntries, communities } = schema;

// The secret behind the public site codes: PUBLIC_CODE_SECRET, or a random one kept next to the
// database, so the app and the scripts (which settle hours) always produce the same codes.
const SECRET_FILE = path.join(process.cwd(), "data", "public-code-secret");
let secret: string | null = null;
function codeSecret(): string {
  if (process.env.PUBLIC_CODE_SECRET) return process.env.PUBLIC_CODE_SECRET;
  if (secret) return secret;
  if (!fs.existsSync(SECRET_FILE)) {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    try {
      fs.writeFileSync(SECRET_FILE, randomBytes(32).toString("hex"), { mode: 0o600, flag: "wx" });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; // another process just created it
    }
  }
  secret = fs.readFileSync(SECRET_FILE, "utf8").trim();
  return secret;
}
export const siteCode = (siteId: string) => publicCode(siteId, codeSecret());

// One hour's public record, from the final allocations and the funded roofs' feed-in.
export function hourRecord(periodStart: number, periodEnd: number): PublicRecord {
  const community = db.select().from(communities).get();
  const trades = db
    .select()
    .from(allocations)
    .where(and(eq(allocations.kind, "final"), gte(allocations.ts, periodStart), lt(allocations.ts, periodEnd)))
    .all()
    .map((a) => ({ ts: a.ts, from: siteCode(a.sellerSiteId), to: siteCode(a.buyerSiteId), kwh: a.kwh, priceCt: a.priceCt }));
  const feedIn = db
    .select()
    .from(ledgerEntries)
    .where(and(like(ledgerEntries.txnId, `%:${GRID}:%`), eq(ledgerEntries.kind, "energy"), gte(ledgerEntries.intervalTs, periodStart), lt(ledgerEntries.intervalTs, periodEnd)))
    .all()
    .filter((e) => e.amountMicro < 0)
    .map((e) => {
      const [ts, siteId, , price] = e.txnId.split(":");
      const priceCt = Number(price);
      return { ts: Number(ts), from: siteCode(siteId), to: GRID, kwh: -e.amountMicro / (priceCt * MICRO_PER_CT), priceCt };
    });
  const federation = flowsIn(periodStart, periodEnd).map((f) => ({ ts: f.ts, community: f.peerId, direction: f.direction, kind: f.kind, kwh: f.kwh, priceCt: f.priceCt }));
  return buildRecord(community?.id ?? "", periodStart, periodEnd, [...trades, ...feedIn], federation);
}
