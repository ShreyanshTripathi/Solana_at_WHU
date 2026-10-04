"use server";

import { redirect } from "next/navigation";
import { authConfig } from "@/lib/auth/config";
import { isAdmin } from "@/lib/auth/policy";
import { getCurrentMember } from "@/lib/auth/session";
import { startDemo, stopDemo } from "@/lib/demo/run";

const hoursOf = (formData?: FormData) => Number(formData?.get("hours") ?? NaN);

// The home page's "Run the live demo" button. Allowed on demo setups (DEMO_LOGIN=true) or for
// Stadtwerk staff, since it changes the community's settings and moves devnet test money.
export async function startDemoAction(formData?: FormData) {
  await assertDemoAllowed();
  startDemo(hoursOf(formData));
  redirect("/demo");
}

// The same demo, started from a dashboard: it stays on that page, so its payments arrive right there.
export async function startDemoHereAction(formData: FormData) {
  await assertDemoAllowed();
  startDemo(hoursOf(formData));
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

// "Stop" and "Reset" on a dashboard: stop after the current hour; a reset also clears the run.
export async function stopDemoHereAction(formData: FormData) {
  await assertDemoAllowed();
  stopDemo(formData.get("reset") === "1");
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

async function assertDemoAllowed() {
  const me = await getCurrentMember();
  if (!authConfig().demoLogin && !(me && isAdmin(me)))
    throw new Error("The live demo is only available on demo setups.");
}
