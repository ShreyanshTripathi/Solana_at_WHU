import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { Volty } from "@/components/brand/Volty";
import { AgentChat, ExplainPanel } from "@/components/agent/AgentChat";
import { agentSettingsOf, recentDecisions } from "@/lib/agents/run";
import { ruleContext } from "@/lib/ai/agent";
import { modelStatus } from "@/lib/ai/ollama";
import { requireMember } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { decisionText } from "@/lib/i18n/text";
import { saveAgentSwitches } from "./actions";

export const dynamic = "force-dynamic";

const card = "rounded-lg border border-black/10 p-5 dark:border-white/15";

export default async function AgentPage() {
  const member = await requireMember("/agent");
  const { m, f } = await getI18n();
  const t = m.agent;
  const site = db.select().from(schema.sites).where(and(eq(schema.sites.memberId, member.id), isNull(schema.sites.closedAt))).get();

  if (!site) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className={`mt-4 text-sm ${card}`}>{t.noSite}</p>
      </main>
    );
  }

  const settings = agentSettingsOf(member.id);
  const decisions = recentDecisions(member.id, 25);
  const status = await modelStatus();
  const neighbours = Object.fromEntries(ruleContext(member.id).neighbours.map((n) => [n.id, n.name]));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="flex items-center gap-3 text-2xl font-semibold">
        <Volty size={44} />
        {t.title}
      </h1>
      <p className="mt-1 text-sm opacity-70">
        {member.name} · {t.intro}
      </p>

      <section className={`mt-6 ${card}`}>
        <h2 className="font-semibold">{t.switches}</h2>
        <form action={saveAgentSwitches} className="mt-3 space-y-4 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="smartBattery" defaultChecked={settings?.smartBattery ?? false} disabled={site.batteryKwh <= 0} className="mt-1" />
            <span>
              <span className="font-medium">{t.smartBattery}</span>
              <span className="block opacity-70">{site.batteryKwh > 0 ? t.smartBatteryNote : t.noBattery}</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="smartEv" defaultChecked={settings?.smartEv ?? false} disabled={site.evChargerKw <= 0} className="mt-1" />
            <span>
              <span className="font-medium">{t.smartEv}</span>
              <span className="block opacity-70">{site.evChargerKw > 0 ? t.smartEvNote : t.noEv}</span>
            </span>
          </label>
          {site.evChargerKw > 0 && (
            <label className="ml-7 flex items-center gap-2">
              {t.readyBy}
              <select name="evReadyByHour" defaultValue={settings?.evReadyByHour ?? 7} className="rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20">
                {[4, 5, 6, 7, 8, 9, 10].map((h) => (
                  <option key={h} value={h}>
                    {t.oclock(h)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="opacity-70">
            <span className="font-medium opacity-100">{t.supplierPick}: </span>
            {t.supplierPickNote}
          </p>
          <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700">
            {m.common.save}
          </button>
        </form>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.tell}</h2>
        <p className="mt-1 mb-3 text-sm opacity-70">{t.tellNote}</p>
        <AgentChat neighbours={neighbours} />
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="font-semibold">{t.log}</h2>
        <p className="mt-1 text-sm opacity-70">{t.logNote}</p>
        {decisions.length === 0 ? (
          <p className="mt-3 text-sm">{t.nothingYet}</p>
        ) : (
          <>
            <div className="mt-3">
              <ExplainPanel />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {decisions.map((d) => (
                <li key={d.id} className="flex gap-3 border-t border-black/5 pt-2 dark:border-white/10">
                  <span className="w-28 shrink-0 tabular-nums opacity-60">
                    {f.day(d.ts)} {f.time(d.ts)}
                  </span>
                  <span>{decisionText(d, m, f)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-dashed border-black/15 p-4 text-xs opacity-80 dark:border-white/20">
        <h2 className="font-semibold">{t.models.title}</h2>
        <ul className="mt-2 space-y-1">
          <li>
            {t.models.llm(status.model)}:{" "}
            {status.ok ? (
              <span className="text-green-700 dark:text-green-400">{t.models.ready}</span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">{status.reason === "not_pulled" ? t.models.notPulled(status.model) : t.models.notRunning}</span>
            )}
          </li>
          <li>{t.models.stt}</li>
          <li>{t.models.tts}</li>
        </ul>
        <p className="mt-2">{t.models.voiceNote}</p>
      </section>
    </main>
  );
}
