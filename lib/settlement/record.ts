import { createHash, createHmac } from "node:crypto";

// The public record of one settled hour: every trade in it, under pseudonymous site codes, in a fixed
// order and format. Its SHA-256 goes into the memo of the hour's Solana transactions, so anyone can
// download the record, hash it, and check it against the chain. Names and meter IDs stay private;
// each member can see their own code on their site page.

export interface PublicTrade {
  ts: number;
  from: string; // seller's code
  to: string; // buyer's code, or "grid" for a funded roof's feed-in
  kwh: number; // 4 decimals
  priceCt: number;
}

// Energy exchanged with a neighbouring community (named: communities are public, homes aren't).
export interface PublicExchange {
  ts: number;
  community: string;
  direction: "import" | "export";
  kind: string;
  kwh: number;
  priceCt: number;
}

export interface PublicRecord {
  version: 1;
  community: string;
  periodStart: number;
  periodEnd: number;
  trades: PublicTrade[];
  federation?: PublicExchange[]; // only present in hours with exchanges, so older hashes still verify
}

// A site's public code: stable, unguessable without the server's secret, short enough to read.
export const publicCode = (siteId: string, secret: string) => `S-${createHmac("sha256", secret).update(siteId).digest("hex").slice(0, 8)}`;

const round4 = (x: number) => Math.round(x * 10_000) / 10_000;

export function buildRecord(community: string, periodStart: number, periodEnd: number, trades: PublicTrade[], federation: PublicExchange[] = []): PublicRecord {
  const exchanges = federation
    .map((x) => ({ ts: x.ts, community: x.community, direction: x.direction, kind: x.kind, kwh: round4(x.kwh), priceCt: x.priceCt }))
    .filter((x) => x.kwh > 0)
    .sort((a, b) => a.ts - b.ts || a.community.localeCompare(b.community) || a.direction.localeCompare(b.direction) || a.kind.localeCompare(b.kind));
  return {
    version: 1,
    community,
    periodStart,
    periodEnd,
    trades: trades
      .map((t) => ({ ts: t.ts, from: t.from, to: t.to, kwh: round4(t.kwh), priceCt: t.priceCt }))
      .filter((t) => t.kwh > 0)
      .sort((a, b) => a.ts - b.ts || a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.priceCt - b.priceCt),
    ...(exchanges.length > 0 ? { federation: exchanges } : {}),
  };
}

// The exact bytes that are hashed and published.
export const recordJson = (r: PublicRecord) => JSON.stringify(r);
export const recordHash = (r: PublicRecord) => createHash("sha256").update(recordJson(r)).digest("hex");

export const MEMO_HASH = /sha256:([0-9a-f]{64})\b/;
export const memoFor = (batchId: string, hash: string) => `Volty ${batchId} sha256:${hash}`;
