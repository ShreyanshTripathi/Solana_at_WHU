import Link from "next/link";
import { db, schema } from "@/db/client";
import { isAdmin } from "@/lib/auth/policy";
import { requireMember } from "@/lib/auth/session";
import { INTERVAL_MS } from "@/lib/config";
import { federationAdvice } from "@/lib/federation/advice";
import { CREDIT_LIMIT_KWH, FEDERATION_PRICE_CT } from "@/lib/federation/match";
import { federationDay, federationSummary } from "@/lib/federation/summary";
import { legality, type Relation } from "@/lib/federation/topology";
import { getI18n } from "@/lib/i18n/server";
import { localMidnight } from "@/lib/sim/clock";
import { simClock } from "@/lib/sim/runner";
import { explorerTxUrl } from "@/lib/solana/wallets";
import { setFederation, setPeerMode } from "./actions";
import { Kpi, TxLink } from "@/components/ui/kit";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";
const DOT: Record<Relation, string> = { same_substation: "#2f9e44", same_area: "#1c7ed6", adjacent_area: "#e8590c", remote: "#c92a2a" };
const CHIP: Record<string, string> = {
  trade: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  credit: "bg-violet-500/15 text-violet-900 dark:text-violet-200",
  repay: "bg-green-600/15 text-green-900 dark:text-green-200",
  credit_settled: "bg-black/5 dark:bg-white/10",
};
const LEVEL_STYLE: Record<Relation, string> = {
  same_substation: "border-green-600/50 bg-green-600/5",
  same_area: "border-blue-600/40 bg-blue-600/5",
  adjacent_area: "border-amber-600/50 border-dashed bg-amber-600/5",
  remote: "border-red-600/40 border-dashed bg-red-600/5",
};

export default async function FederationPage() {
  const me = await requireMember("/federation");
  const admin = isAdmin(me);
  const { m, f } = await getI18n();
  const t = m.federation;
  const community = db.select().from(schema.communities).get();
  const peers = db.select().from(schema.federationPeers).all();
  const enabled = Boolean(community?.federationEnabled);
  const asOf = simClock() - INTERVAL_MS;
  const advice = enabled && peers.length > 0 ? federationAdvice(asOf) : null;
  const summary = federationSummary();
  const dayStart = localMidnight(asOf);
  const today = federationDay(dayStart, asOf + INTERVAL_MS);
  const notAllowed = (relation: Relation) => {
    const l = legality(relation, asOf);
    return l.allowed ? null : l.reason;
  };
  const nameOf = (id: string) => peers.find((p) => p.id === id)?.name ?? id;
  const kwh = (x: number) => f.kwh(x, 1);
  const status = (r: { legality: { allowed: boolean; reason?: string } }) => (r.legality.allowed ? t.allowed : t.blocked[r.legality.reason ?? "not_sharing"]);

  const ring = (relation: Relation) => (
    <div className="flex flex-wrap gap-2">
      {peers
        .filter((p) => p.relation === relation)
        .map((p) => (
          <span key={p.id} className="rounded-full border border-black/15 bg-white px-2 py-0.5 text-xs dark:border-white/20 dark:bg-neutral-900">
            {p.name} · {f.num(p.distanceKm)} km
          </span>
        ))}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-1 max-w-3xl text-sm opacity-70">{t.intro}</p>

      <section className={`mt-6 ${card}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className={`font-semibold ${enabled ? "text-green-700 dark:text-green-400" : ""}`}>{enabled ? t.on : t.off}</span>
            <span className="opacity-70"> · {t.priceNote(f.ct(FEDERATION_PRICE_CT), f.int(CREDIT_LIMIT_KWH))}</span>
          </p>
          {admin && (
            <form action={setFederation} className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="enabled" defaultChecked={enabled} />
                {t.enable}
              </label>
              <button type="submit" className="rounded-md bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700">
                {m.common.save}
              </button>
            </form>
          )}
        </div>
      </section>

      {enabled && (
        <section className={`mt-4 ${card}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">{t.todayTitle(f.day(dayStart), f.time(asOf + INTERVAL_MS))}</h2>
            <Link href="/map?view=region" className="text-sm text-blue-700 underline dark:text-blue-300">
              {t.onMap} →
            </Link>
          </div>
          <p className="mt-1 flex flex-wrap gap-x-4 text-xs opacity-60">
            <span>↙ {t.toYou}</span>
            <span>↗ {t.fromYou}</span>
          </p>
          <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10">
            {peers
              .filter((p) => !notAllowed(p.relation))
              .map((p) => {
                const rows = today.get(p.id) ?? [];
                const net = rows.reduce((s, r) => s + (r.direction === "import" ? r.kwh : -r.kwh), 0);
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <span className="flex w-64 shrink-0 items-start gap-2.5">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DOT[p.relation] }} />
                      <span>
                        <span className="block text-sm font-medium">{p.name}</span>
                        <span className="block text-xs opacity-60">
                          {t.level[p.relation].replace(/ \(.*\)/, "")} · {f.num(p.distanceKm)} km
                        </span>
                      </span>
                    </span>
                    {rows.length === 0 ? (
                      <span className="flex-1 text-sm opacity-60">{t.nothingToday}</span>
                    ) : (
                      <span className="flex flex-1 flex-wrap gap-2">
                        {rows.map((r) => (
                          <span
                            key={`${r.direction}${r.kind}`}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${CHIP[r.kind] ?? CHIP.trade}`}
                          >
                            <span aria-label={r.direction === "import" ? t.toYou : t.fromYou}>{r.direction === "import" ? "↙" : "↗"}</span>
                            <span className="tabular-nums">{kwh(r.kwh)}</span>
                            <span className="font-normal opacity-80">{t.flowKind[r.kind]}</span>
                            {r.eur > 0 && <span className="tabular-nums">· {f.eur(r.eur)}</span>}
                          </span>
                        ))}
                      </span>
                    )}
                    {rows.length > 0 && (
                      <span className={`w-28 shrink-0 text-right text-sm font-semibold tabular-nums ${net >= 0 ? "" : "opacity-70"}`}>
                        {net >= 0 ? t.netIn(kwh(net)) : t.netOut(kwh(-net))}
                      </span>
                    )}
                  </li>
                );
              })}
          </ul>
          {peers.some((p) => notAllowed(p.relation)) && (
            <div className="mt-3 rounded-lg bg-black/[0.03] p-3 dark:bg-white/5">
              <p className="text-xs font-medium uppercase tracking-wide opacity-60">{t.cannotShare}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {peers
                  .filter((p) => notAllowed(p.relation))
                  .map((p) => (
                    <li key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-black/20 px-2.5 py-1 text-xs dark:border-white/25">
                      <span aria-hidden className="text-red-600">✕</span>
                      <span className="font-medium">{p.name}</span>
                      <span className="opacity-60">· {f.num(p.distanceKm)} km · {t.short[notAllowed(p.relation)!]}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.levelsTitle}</h2>
        <p className="mt-1 text-xs opacity-70">{t.levelsNote}</p>
        <div className={`mt-4 rounded-xl border-2 p-3 ${LEVEL_STYLE.remote}`}>
          <p className="text-xs font-medium">{t.level.remote}</p>
          <div className="mt-2">{ring("remote")}</div>
          <div className={`mt-3 rounded-xl border-2 p-3 ${LEVEL_STYLE.adjacent_area}`}>
            <p className="text-xs font-medium">{t.level.adjacent_area}</p>
            <div className="mt-2">{ring("adjacent_area")}</div>
            <div className={`mt-3 rounded-xl border-2 p-3 ${LEVEL_STYLE.same_area}`}>
              <p className="text-xs font-medium">{t.level.same_area}</p>
              <div className="mt-2">{ring("same_area")}</div>
              <div className={`mt-3 rounded-xl border-2 p-3 ${LEVEL_STYLE.same_substation}`}>
                <p className="text-xs font-medium">{t.level.same_substation}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">{community?.name ?? "Volty"} ({t.you})</span>
                  {ring("same_substation")}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs opacity-70">{t.chainNote}</p>
      </section>

      {!enabled ? (
        <p className={`mt-4 text-sm ${card}`}>{admin ? t.offAdmin : t.offMember}</p>
      ) : (
        advice && (
          <section className={`mt-4 ${card}`}>
            <h2 className="font-semibold">{t.adviceTitle(f.day(advice.asOf), f.time(advice.asOf))}</h2>
            {advice.pick ? (
              <p className="mt-2 rounded-md border border-blue-600/30 bg-blue-600/5 px-3 py-2 text-sm">
                <span className="font-medium">{t.pick(advice.pick.name)}</span> {t.pickWhy(t.level[advice.pick.relation], kwh(advice.pick.importKwh), kwh(advice.pick.exportKwh))}
              </p>
            ) : (
              <p className="mt-2 text-sm opacity-80">{t.noPick}</p>
            )}
            <p className="mt-2 text-sm opacity-80">
              {t.adviceSummary(kwh(advice.ownDeficitKwh), kwh(advice.matchedImportKwh), kwh(advice.ownSurplusKwh), kwh(advice.matchedExportKwh), f.eur(advice.savingEur), f.eur(advice.extraEur))}
            </p>
            {advice.hours.length > 0 && (
              <div className="mt-3 max-h-72 overflow-auto">
                <table className="kw-table w-full text-sm tabular-nums">
                  <thead className="text-left text-xs opacity-70">
                    <tr>
                      <th className="py-1 font-normal">{t.table.hour}</th>
                      <th className="py-1 text-right font-normal">{t.table.short}</th>
                      <th className="py-1 text-right font-normal">{t.table.left}</th>
                      <th className="py-1 pl-4 font-normal">{t.table.best}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advice.hours.map((h) => (
                      <tr key={h.hourTs} className="border-t border-black/5 dark:border-white/10">
                        <td className="py-1">
                          {f.day(h.hourTs)} {f.time(h.hourTs)}
                        </td>
                        <td className="py-1 text-right">{kwh(h.deficitKwh)}</td>
                        <td className="py-1 text-right">{kwh(h.surplusKwh)}</td>
                        <td className="py-1 pl-4">{h.best ? `${h.direction === "import" ? t.from : t.to} ${nameOf(h.best)}` : t.grid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs opacity-70">{t.adviceNote}</p>
          </section>
        )
      )}

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.peersTitle}</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="kw-table w-full text-sm">
            <thead className="text-left text-xs opacity-70">
              <tr>
                <th className="py-1 font-normal">{t.table.community}</th>
                <th className="py-1 font-normal">{t.table.level}</th>
                <th className="py-1 font-normal">{t.table.status}</th>
                <th className="py-1 text-right font-normal">{t.table.exchanged}</th>
                <th className="py-1 text-right font-normal">{t.table.credit}</th>
                <th className="py-1 pl-4 font-normal">{t.table.mode}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {(advice?.ranking ?? peers.map((p) => ({ ...p, legality: { allowed: true }, balance: { weOweKwh: 0, theyOweKwh: 0 } }))).map((p) => {
                const s = summary.perPeer.get(p.id);
                return (
                  <tr key={p.id} className="border-t border-black/5 align-top dark:border-white/10">
                    <td className="py-1">
                      {p.name}
                      <span className="block text-xs opacity-60">
                        {p.operator} · {f.num(p.distanceKm)} km
                      </span>
                    </td>
                    <td className="py-1 text-xs">{t.level[p.relation as Relation]}</td>
                    <td className="py-1 text-xs">{status(p as { legality: { allowed: boolean; reason?: string } })}</td>
                    <td className="py-1 text-right text-xs">
                      ↓ {kwh(s?.importKwh ?? 0)} · ↑ {kwh(s?.exportKwh ?? 0)}
                    </td>
                    <td className="py-1 text-right text-xs">
                      {p.balance.weOweKwh > 0.01 ? t.weOwe(kwh(p.balance.weOweKwh)) : p.balance.theyOweKwh > 0.01 ? t.theyOwe(kwh(p.balance.theyOweKwh)) : "–"}
                    </td>
                    <td className="py-1 pl-4 text-xs">
                      {admin ? (
                        <form action={setPeerMode} className="flex items-center gap-2">
                          <input type="hidden" name="peerId" value={p.id} />
                          <select name="mode" defaultValue={p.mode} className="rounded border border-black/15 bg-transparent px-1 py-0.5 dark:border-white/20">
                            <option value="trade">{t.mode.trade}</option>
                            <option value="credit">{t.mode.credit}</option>
                          </select>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" name="active" defaultChecked={peers.find((x) => x.id === p.id)?.active ?? true} />
                            {t.active}
                          </label>
                          <button type="submit" className="underline">
                            {m.common.save}
                          </button>
                        </form>
                      ) : (
                        t.mode[p.mode as "trade" | "credit"]
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs opacity-70">{t.modeNote}</p>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.historyTitle}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label={t.kpiIn} value={kwh(summary.importKwh)} />
          <Kpi label={t.kpiOut} value={kwh(summary.exportKwh)} />
          <Kpi label={t.kpiSaved} value={f.eur(summary.savingEur)} tone="accent" />
          <Kpi label={t.kpiEarned} value={f.eur(summary.extraEur)} tone="accent" />
        </div>
        <div className="mt-5 grid gap-6">
          <div>
            <h3 className="text-sm font-semibold">{t.perCommunity}</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="kw-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">{t.table.community}</th>
                    <th className="text-right">{t.colIn}</th>
                    <th className="text-right">{t.colOut}</th>
                    <th className="text-right">{t.colPaid}</th>
                    <th className="text-right">{t.colReceived}</th>
                  </tr>
                </thead>
                <tbody>
                  {peers
                    .filter((p) => {
                      const x = summary.perPeer.get(p.id);
                      return x && x.importKwh + x.exportKwh > 0;
                    })
                    .map((p) => {
                      const x = summary.perPeer.get(p.id)!;
                      return (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td className="text-right">{kwh(x.importKwh)}</td>
                          <td className="text-right">{kwh(x.exportKwh)}</td>
                          <td className="text-right">{x.paidMicro > 0 ? f.eur(x.paidMicro / 1_000_000) : "–"}</td>
                          <td className="text-right">{x.receivedMicro > 0 ? f.eur(x.receivedMicro / 1_000_000) : "–"}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t.latestSettlements}</h3>
            {summary.settlements.length === 0 ? (
              <p className="mt-2 text-sm opacity-60">–</p>
            ) : (
              <ul className="mt-2 divide-y divide-black/5 dark:divide-white/10">
                {summary.settlements.slice(0, 6).map((s) => {
                  const out = s.fromAccount === "federation:us";
                  const peer = nameOf((out ? s.toAccount : s.fromAccount).slice(11));
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                      <span
                        aria-hidden
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${out ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-green-600/15 text-green-800 dark:text-green-300"}`}
                      >
                        {out ? "↗" : "↙"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{peer}</span>
                        <span className="block text-xs opacity-60">{out ? t.weePaid : t.theyPaid}</span>
                      </span>
                      <span className="font-semibold tabular-nums">{f.eur(s.amountMicro / 1_000_000)}</span>
                      {s.signature && <TxLink href={explorerTxUrl(s.signature)} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs opacity-60">
          {t.historyNote}{" "}
          <Link href="/verify" className="underline">
            {m.verify.open}
          </Link>
        </p>
      </section>

      <p className="mt-4 text-xs opacity-60">{t.honesty}</p>
    </main>
  );
}
