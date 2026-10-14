"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";
import { assertCanActFor } from "@/lib/auth/policy";
import { requireAdmin, requireMember } from "@/lib/auth/session";
import { MICRO_PER_EUR } from "@/lib/config";
import { siteIdFor } from "@/lib/demo/personas";
import { expireFundingRounds, FUNDING_DAYS, fundingDeadlineFrom } from "@/lib/projects/funding";

// Demo funding flow (FR-SNP-01/02/10). In the demo, funds are recorded off-chain;
// production holds them in an on-chain escrow run through a partner energy cooperative.

export async function createProject(formData: FormData) {
  // A household offers its own roof; staff can start a project for any member.
  const hostMemberId = assertCanActFor(await requireMember("/projects"), String(formData.get("hostMemberId") ?? ""));
  const kwp = Number(formData.get("kwp"));
  const costEur = Number(formData.get("costEur"));
  if (!hostMemberId || !(kwp > 0 && kwp <= 100)) throw new Error("System size must be between 0 and 100 kWp.");
  if (!(costEur >= 1_000 && costEur <= 200_000)) throw new Error("Installed cost must be between €1,000 and €200,000.");
  const fundingDays = Number(formData.get("fundingDays") ?? FUNDING_DAYS.default);
  if (!(Number.isInteger(fundingDays) && fundingDays >= FUNDING_DAYS.min && fundingDays <= FUNDING_DAYS.max)) {
    throw new Error(`The funding round must run ${FUNDING_DAYS.min} to ${FUNDING_DAYS.max} days.`);
  }

  const hostSiteId = siteIdFor(hostMemberId);
  if (!db.select().from(schema.sites).where(eq(schema.sites.id, hostSiteId)).get()) throw new Error("This member has no roof on record.");
  const existing = db.select().from(schema.projects).where(eq(schema.projects.hostSiteId, hostSiteId)).get();
  if (existing) throw new Error("This roof already has a project.");

  const principalMicro = Math.round(costEur * MICRO_PER_EUR);
  db.insert(schema.projects)
    .values({
      id: hostMemberId, // one project per roof; the reserve wallet is reserve-<host>
      hostSiteId,
      name: `${String(formData.get("name") || "Rooftop solar")}, ${kwp} kWp`,
      principalMicro,
      returnBps: 1_500, // 15% over the payoff, about 1.5% a year over ten years
      feeBps: 300,
      reserveBps: 500,
      reserveTargetMicro: Math.round(principalMicro * 0.05),
      investorShareBps: 8_500,
      fundingDeadline: fundingDeadlineFrom(Date.now(), fundingDays),
      state: "funding",
    })
    .run();
  // Remember the planned size so "installed" can switch the panels on.
  db.insert(schema.simState)
    .values({ key: `planned-kwp:${hostSiteId}`, value: String(kwp) })
    .onConflictDoUpdate({ target: schema.simState.key, set: { value: String(kwp) } })
    .run();
  revalidatePath("/projects");
}

export async function invest(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const investorMemberId = assertCanActFor(await requireMember("/projects"), String(formData.get("investorMemberId") ?? ""));
  const amountEur = Number(formData.get("amountEur"));
  if (!(amountEur > 0)) throw new Error("Enter an amount above €0.");
  expireFundingRounds(); // a round past its deadline can't take more money

  db.transaction((tx) => {
    const project = tx.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
    if (!project || project.state !== "funding") throw new Error("This project is not raising money.");
    const amountMicro = Math.min(Math.round(amountEur * MICRO_PER_EUR), project.principalMicro - project.raisedMicro);
    const id = `inv-${investorMemberId}-${projectId}`;
    const position = tx.select().from(schema.investments).where(eq(schema.investments.id, id)).get();
    if (position) {
      tx.update(schema.investments).set({ amountMicro: position.amountMicro + amountMicro }).where(eq(schema.investments.id, id)).run();
    } else {
      tx.insert(schema.investments).values({ id, projectId, investorMemberId, amountMicro }).run();
    }
    const raisedMicro = project.raisedMicro + amountMicro;
    tx.update(schema.projects)
      .set({ raisedMicro, state: raisedMicro >= project.principalMicro ? "funded" : "funding" })
      .where(eq(schema.projects.id, projectId))
      .run();
  });
  revalidatePath("/projects");
}

// Funded -> installed -> repaying: the panels go live, and the next simulated sales start repaying investors.
export async function markInstalled(formData: FormData) {
  await requireAdmin("/projects"); // installation is confirmed by the Stadtwerk, not the host
  const projectId = String(formData.get("projectId") ?? "");
  db.transaction((tx) => {
    const project = tx.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
    if (!project || project.state !== "funded") throw new Error("Only a fully funded project can be installed.");
    const planned = tx.select().from(schema.simState).where(eq(schema.simState.key, `planned-kwp:${project.hostSiteId}`)).get();
    const site = tx.select().from(schema.sites).where(eq(schema.sites.id, project.hostSiteId)).get()!;
    tx.update(schema.sites)
      .set({ pvKwp: site.pvKwp + Number(planned?.value ?? 0) })
      .where(eq(schema.sites.id, site.id))
      .run();
    tx.update(schema.projects).set({ state: "repaying" }).where(eq(schema.projects.id, projectId)).run();
  });
  revalidatePath("/projects");
}
