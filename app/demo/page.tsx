import { Volty } from "@/components/brand/Volty";
import { DemoProgress } from "@/components/demo/DemoProgress";
import { authConfig } from "@/lib/auth/config";
import { isAdmin } from "@/lib/auth/policy";
import { getCurrentMember } from "@/lib/auth/session";
import { DemoLength } from "@/components/demo/DemoLength";
import { DEMO_HOURS, demoState, demoWindow } from "@/lib/demo/run";
import { getI18n } from "@/lib/i18n/server";
import { demoLogin } from "../login/actions";
import { startDemoAction } from "./actions";

export const dynamic = "force-dynamic";

// Who each tour step logs in as, and where it opens. The words are in the message files (demo.tourSteps).
const TOUR = [
  { accountId: "acc-stadtwerk", who: "Stadtwerk Vallendar", next: "/admin" },
  {
    accountId: "acc-stadtwerk",
    who: "Stadtwerk Vallendar",
    next: "/federation",
  },
  { accountId: "acc-anna", who: "Anna Schmitt", next: "/seller" },
  { accountId: "acc-anna", who: "Anna Schmitt", next: "/agent" },
  { accountId: "acc-ben", who: "Ben Wagner", next: "/buyer" },
  { accountId: "acc-baeckerei", who: "Bäckerei Müller", next: "/sme" },
  { accountId: "acc-lena", who: "Lena", next: "/projects" },
  { accountId: "acc-anna", who: "Anna Schmitt", next: "/map" },
];
const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";

export default async function DemoPage() {
  const { m } = await getI18n();
  const t = m.demo;
  const me = await getCurrentMember();
  const allowed = authConfig().demoLogin || (me !== null && isAdmin(me));
  const state = demoState();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="flex items-center gap-3 text-2xl font-semibold">
        <Volty size={52} mood="wink" />
        {t.title}
      </h1>
      <p className="mt-1 text-sm opacity-70">{t.intro}</p>
      {!allowed ? (
        <p className={`mt-6 text-sm ${card}`}>{t.notAvailable}</p>
      ) : (
        <>
          {!state.running && (
            <form
              action={startDemoAction}
              className="mt-4 flex flex-wrap items-center gap-4"
            >
              <DemoLength
                startHour={demoWindow().startHour}
                min={DEMO_HOURS.min}
                max={DEMO_HOURS.max}
                initial={DEMO_HOURS.default}
              />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {state.startedAt ? t.again : t.start}
              </button>
            </form>
          )}
          {/* A new run remounts the progress, so it starts from the new state and polls again. */}
          <DemoProgress key={state.startedAt ?? 0} initial={state} />

          <h2 className="mt-10 text-lg font-semibold">{t.tour}</h2>
          <p className="mt-1 text-sm opacity-70">{t.tourIntro}</p>
          <ol className="mt-4 space-y-3">
            {t.tourSteps.map((s, i) => (
              <li key={s.title} className={card}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-semibold">{s.title}</h3>
                  {authConfig().demoLogin && (
                    <form action={demoLogin}>
                      <input
                        type="hidden"
                        name="accountId"
                        value={TOUR[i].accountId}
                      />
                      <input type="hidden" name="next" value={TOUR[i].next} />
                      <button
                        type="submit"
                        className="rounded-md border border-blue-600 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-600/10 dark:text-blue-300"
                      >
                        {t.open(TOUR[i].who)} →
                      </button>
                    </form>
                  )}
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm opacity-90">
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
