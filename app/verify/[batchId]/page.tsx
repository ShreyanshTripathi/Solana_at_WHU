import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { verifyHour } from "@/lib/settlement/verify";
import { explorerTxUrl } from "@/lib/solana/wallets";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";
const ok = "text-green-700 dark:text-green-400";
const bad = "text-red-700 dark:text-red-400";

// Public: one settled hour. The record is rebuilt from the database now, hashed, and compared with
// the hash stored at settlement and the hash in the Solana memo, which nobody can change afterwards.
export default async function VerifyHour({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const v = await verifyHour(batchId);
  if (!v) notFound();
  const { m, f } = await getI18n();
  const t = m.verify;
  const verdict =
    v.chain === "match" ? { cls: ok, text: t.verdict.match } : v.chain === "mismatch" ? { cls: bad, text: t.verdict.mismatch } : { cls: "opacity-80", text: t.verdict[v.chain] };
  const jsonUrl = `/api/public/hour/${v.batch.id}`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <p className="text-sm">
        <Link href="/verify" className="underline">
          ← {t.title}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{t.hourTitle(f.day(v.batch.periodStart), f.time(v.batch.periodStart), f.time(v.batch.periodEnd))}</h1>

      <section className={`mt-6 ${card}`}>
        <p className={`text-lg font-semibold ${verdict.cls}`}>{verdict.text}</p>
        <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="opacity-70">{t.recomputed}</dt>
          <dd className="font-mono text-xs break-all">{v.recomputed}</dd>
          <dt className="opacity-70">{t.onChain}</dt>
          <dd className="font-mono text-xs break-all">
            {v.chainHash ?? "–"}
            {v.signature && (
              <a href={explorerTxUrl(v.signature)} target="_blank" rel="noreferrer" className="ml-2 font-sans underline">
                {t.viewTx}
              </a>
            )}
          </dd>
          <dt className="opacity-70">{t.stored}</dt>
          <dd className={`text-xs ${v.storedMatches ? ok : "opacity-80"}`}>{v.storedMatches ? t.storedSame : t.storedDifferent}</dd>
        </dl>
        <p className="mt-4 text-sm opacity-80">{t.howTo}</p>
        <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-2 text-xs dark:bg-white/10">{`curl -s ${"<this site>"}${jsonUrl} | shasum -a 256`}</pre>
        <p className="mt-2 text-sm">
          <a href={jsonUrl} className="underline">
            {t.download(f.int(v.bytes))}
          </a>
        </p>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.trades(v.record.trades.length)}</h2>
        <p className="mt-1 text-xs opacity-70">{t.tradesNote}</p>
        <div className="mt-2 max-h-[28rem] overflow-auto">
          <table className="kw-table w-full text-sm tabular-nums">
            <thead className="text-left text-xs opacity-70">
              <tr>
                <th className="py-1 font-normal">{t.time}</th>
                <th className="py-1 font-normal">{t.from}</th>
                <th className="py-1 font-normal">{t.to}</th>
                <th className="py-1 text-right font-normal">kWh</th>
                <th className="py-1 text-right font-normal">{t.price}</th>
              </tr>
            </thead>
            <tbody>
              {v.record.trades.map((tr, i) => (
                <tr key={i} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-1">{f.time(tr.ts)}</td>
                  <td className="py-1 font-mono text-xs">{tr.from}</td>
                  <td className="py-1 font-mono text-xs">{tr.to === "grid" ? t.grid : tr.to}</td>
                  <td className="py-1 text-right">{f.num(tr.kwh, 3)}</td>
                  <td className="py-1 text-right">{f.ct(tr.priceCt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
