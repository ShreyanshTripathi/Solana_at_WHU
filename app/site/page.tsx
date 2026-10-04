import Link from "next/link";
import { and, inArray, isNull } from "drizzle-orm";
import { SiteForm } from "@/components/site/SiteForm";
import { db, schema } from "@/db/client";
import { requireMember } from "@/lib/auth/session";
import { COMMUNITY } from "@/lib/config";
import { DEMO_FREE_METERS } from "@/lib/grid/demoOperator";
import { getI18n } from "@/lib/i18n/server";
import { rejectionText } from "@/lib/i18n/text";
import { siteCode } from "@/lib/settlement/publish";
import { openSiteOf, parseRejection, registrationsOf } from "@/lib/sites/register";
import { setExactLocation } from "./actions";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";

export default async function SitePage({ searchParams }: PageProps<"/site">) {
  const result = (await searchParams).result;
  const member = await requireMember("/site");
  const { m, f } = await getI18n();
  const t = m.site;
  const kw = (x: number, unit: string) => (x > 0 ? `${f.num(x, x % 1 === 0 ? 0 : 1)} ${unit}` : m.common.none);
  const site = openSiteOf(member.id);
  const history = registrationsOf(member.id);
  const canHaveSite = member.kind === "household" || member.kind === "sme";

  // Demo helper: meters the stand-in grid operator knows that nobody has registered yet.
  const taken = new Set(
    db
      .select({ meterId: schema.sites.meterId })
      .from(schema.sites)
      .where(and(isNull(schema.sites.closedAt), inArray(schema.sites.meterId, DEMO_FREE_METERS.map((m) => m.maloId))))
      .all()
      .map((r) => r.meterId),
  );
  const freeMeters = DEMO_FREE_METERS.filter((m) => !taken.has(m.maloId));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-1 text-sm opacity-70">{t.intro(member.name, COMMUNITY.gridAreaId)}</p>

      {result === "approved" && (
        <p role="status" className="mt-4 rounded-md border border-green-600/40 p-3 text-sm">
          {t.approved}
        </p>
      )}
      {result === "rejected" && (
        <p role="alert" className="mt-4 rounded-md border border-red-600/40 p-3 text-sm">
          {t.rejected}
        </p>
      )}

      {!canHaveSite ? (
        <p className={`mt-6 text-sm ${card}`}>{t.noSite}</p>
      ) : site ? (
        <section className={`mt-6 ${card}`}>
          <h2 className="font-semibold">{site.address ?? site.label}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs opacity-70">{t.fields.meter}</dt>
              <dd className="font-mono">{site.meterId ?? t.notRecorded}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-70">{m.verify.yourCode}</dt>
              <dd className="font-mono" title={m.verify.yourCodeNote}>
                <Link href="/verify" className="underline">
                  {siteCode(site.id)}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs opacity-70">{t.fields.grid}</dt>
              <dd>{site.gridAreaId ?? t.notRecorded}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-70">{t.fields.use}</dt>
              <dd>{f.kwh(site.annualKwh, 0)}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-70">{t.fields.solar}</dt>
              <dd>{kw(site.pvKwp, "kWp")}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-70">{t.fields.battery}</dt>
              <dd>{kw(site.batteryKwh, "kWh")}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-70">{t.fields.ev}</dt>
              <dd>{kw(site.evChargerKw, "kW")}</dd>
            </div>
          </dl>
          <form action={setExactLocation} className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="showExactLocation" defaultChecked={site.showExactLocation} />
              {t.exactLocation}
            </label>
            <button type="submit" className="rounded border border-black/15 px-3 py-1 dark:border-white/20">
              {m.common.save}
            </button>
            <span className="w-full text-xs opacity-70">{t.exactLocationNote}</span>
          </form>
          <p className="mt-3 text-xs opacity-70">{t.contact}</p>
        </section>
      ) : (
        <>
          <section className={`mt-6 ${card}`}>
            <h2 className="mb-3 font-semibold">{t.register}</h2>
            <SiteForm defaultAnnualKwh={member.kind === "sme" ? 20_000 : 3_500} />
          </section>
          <section className={`mt-4 ${card}`}>
            <h2 className="text-sm font-semibold">{t.demoMeters}</h2>
            <p className="mt-1 text-xs opacity-70">{t.demoMetersNote}</p>
            <div className="mt-2 overflow-x-auto">
              <table className="kw-table w-full text-xs">
                <tbody>
                  {freeMeters.map((m) => (
                    <tr key={m.maloId} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-1 font-mono">{m.maloId}</td>
                      <td className="py-1">
                        {m.street}, {m.postcode} {m.city}
                      </td>
                      <td className="py-1 opacity-70">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {history.length > 0 && (
        <section className={`mt-6 ${card}`}>
          <h2 className="font-semibold">{t.history}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {history.map((r) => (
              <li key={r.id} className="border-t border-black/5 pt-2 first:border-0 first:pt-0 dark:border-white/10">
                <span className="font-medium">{t.status[r.status]}</span> · {r.street}, {r.postcode} {r.city} · {t.meter}{" "}
                <span className="font-mono">{r.meterId}</span> · {f.dateTime(r.createdAt)}
                {parseRejection(r.reason) && <span className="block text-xs opacity-80">{rejectionText(m, parseRejection(r.reason)!)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
