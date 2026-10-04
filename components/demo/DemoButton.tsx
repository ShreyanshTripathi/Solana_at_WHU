import { startDemoHereAction, stopDemoHereAction } from "@/app/demo/actions";
import { authConfig } from "@/lib/auth/config";
import { isAdmin } from "@/lib/auth/policy";
import { getCurrentMember } from "@/lib/auth/session";
import { DemoLength } from "@/components/demo/DemoLength";
import { DEMO_HOURS, demoState, demoWindow } from "@/lib/demo/run";
import { getI18n } from "@/lib/i18n/server";

const secondary =
  "inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:cursor-default disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10";

// The demo controls on a dashboard: "Run the live demo" starts the one-click demo and stays on this
// page, so the payments arrive right here; "Stop" ends it after the current hour, "Reset" also clears
// the run. Only on demo setups or for Stadtwerk staff.
export async function DemoButton({ next }: { next: string }) {
  const me = await getCurrentMember();
  if (!authConfig().demoLogin && !(me && isAdmin(me))) return null;
  const { m } = await getI18n();
  const state = demoState();
  const { running, stopping } = state;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action={startDemoHereAction}
        className="flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="next" value={next} />
        {!running && (
          <DemoLength
            startHour={demoWindow().startHour}
            min={DEMO_HOURS.min}
            max={DEMO_HOURS.max}
            initial={DEMO_HOURS.default}
          />
        )}
        <button
          type="submit"
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-default disabled:bg-blue-600/40"
        >
          <span aria-hidden>{running ? "◐" : "▶"}</span>
          {running && stopping
            ? m.demo.stoppingShort
            : running
              ? m.demo.runningShort
              : state.startedAt
                ? m.demo.againShort
                : m.demo.run}
        </button>
      </form>
      {running && (
        <form action={stopDemoHereAction}>
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            disabled={stopping !== null}
            title={m.demo.stopHint}
            className={secondary}
          >
            <span aria-hidden>■</span>
            {m.demo.stop}
          </button>
        </form>
      )}
      {state.startedAt && (
        <form action={stopDemoHereAction}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="reset" value="1" />
          <button
            type="submit"
            disabled={stopping === "reset"}
            title={m.demo.resetHint}
            className={secondary}
          >
            <span aria-hidden>↺</span>
            {m.demo.reset}
          </button>
        </form>
      )}
    </div>
  );
}
