import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { recentBatches } from "@/lib/settlement/verify";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";

// Public: every settled hour, each with its record and the hash on Solana. No login needed.
export default async function VerifyIndex() {
  const { m, f } = await getI18n();
  const t = m.verify;
  const batches = recentBatches();
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-1 text-sm opacity-70">{t.intro}</p>
      <section className={`mt-6 ${card}`}>
        {batches.length === 0 ? (
          <p className="text-sm">{t.noneYet}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="kw-table w-full text-sm tabular-nums">
              <thead className="text-left text-xs opacity-70">
                <tr>
                  <th className="py-1 font-normal">{t.hour}</th>
                  <th className="py-1 font-normal">{t.status}</th>
                  <th className="py-1 font-normal">{t.hash}</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-1">
                      {f.day(b.periodStart)} {f.time(b.periodStart)}
                    </td>
                    <td className="py-1">
                      {m.common.batchStatus[b.status] ?? b.status}
                      {b.mode === "p2p" && <span className="opacity-70"> · {t.p2p}</span>}
                    </td>
                    <td className="py-1 font-mono text-xs">{b.allocationHash.slice(0, 16)}…</td>
                    <td className="py-1 text-right">
                      <Link href={`/verify/${b.id}`} className="text-blue-700 underline dark:text-blue-300">
                        {t.check} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
