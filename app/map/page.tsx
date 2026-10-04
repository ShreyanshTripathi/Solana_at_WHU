import Link from "next/link";
import { Map3DLoader, RegionMapLoader } from "@/components/map3d/Map3DLoader";
import { requireMember } from "@/lib/auth/session";
import { getMap3d } from "@/lib/dashboard/map3d";
import { getRegionMap } from "@/lib/dashboard/regionMap";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const HOUR_MS = 3_600_000;

export default async function Map3dPage({ searchParams }: PageProps<"/map">) {
  const me = await requireMember("/map");
  const { m, f } = await getI18n();
  const t = m.map3d;
  const region = (await searchParams).view === "region";
  const data = getMap3d(me);
  const regionData = data ? getRegionMap(data.dayStart, data.dayStart + (data.lastHour + 1) * HOUR_MS - 15 * 60 * 1000) : null;
  // The region opens on the hour with the most exchanged with neighbours.
  const busiest = regionData
    ? regionData.hours.reduce((best, h, i) => (h.flows.reduce((s, x) => s + x.kwh, 0) > regionData.hours[best].flows.reduce((s, x) => s + x.kwh, 0) ? i : best), 12)
    : 12;
  const tab = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm ${active ? "bg-blue-600/10 font-medium text-blue-700 dark:text-blue-300" : "opacity-80 hover:bg-black/5 dark:hover:bg-white/10"}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">{region ? t.region.title : t.title}</h1>
        <nav className="flex gap-1" aria-label={t.region.tabs}>
          <Link href="/map" className={tab(!region)} aria-current={!region ? "page" : undefined}>
            {t.region.tabNeighbourhood}
          </Link>
          <Link href="/map?view=region" className={tab(region)} aria-current={region ? "page" : undefined}>
            {t.region.tabRegion}
          </Link>
        </nav>
      </div>
      {!data ? (
        <p className="mt-2 text-sm">{t.noData}</p>
      ) : region ? (
        regionData ? (
          <>
            <p className="mt-1 text-sm opacity-70">{t.region.intro(f.date(data.dayStart))}</p>
            <div className="mt-4">
              <RegionMapLoader data={regionData} dayStart={data.dayStart} lastHour={data.lastHour} startHour={Math.min(busiest, data.lastHour)} />
            </div>
            <p className="mt-2 text-xs opacity-60">
              {t.region.honesty}{" "}
              <Link href="/federation" className="underline">
                {t.region.toFederation}
              </Link>
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm">{t.region.noPeers}</p>
        )
      ) : (
        <>
          <p className="mt-1 text-sm opacity-70">{t.intro(f.date(data.dayStart))}</p>
          <p className="mt-1 text-xs opacity-60">{t.rotateHint}</p>
          <div className="mt-4">
            <Map3DLoader data={data} />
          </div>
          <p className="mt-2 text-xs opacity-60">
            {t.lvNote} {t.attribution}
          </p>
        </>
      )}
    </main>
  );
}
