import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import * as z from "zod";
import { db, schema } from "@/db/client";
import { siteIdFor } from "@/lib/demo/personas";
import { demoGridOperator } from "@/lib/grid/demoOperator";
import { isValidMaloId, normaliseMaloId } from "@/lib/grid/malo";
import type { GridOperator } from "@/lib/grid/operator";
import type { Member } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import { decideSite, type RejectionReason } from "./decide";

const { sites, siteRegistrations } = schema;
export type SiteRegistration = typeof siteRegistrations.$inferSelect;

// Error messages are codes (site.errors in the message files), so the form can show them in either language.
const number = (code: string, min: number, max: number) => z.coerce.number({ error: code }).min(min, code).max(max, code);

export const siteFormSchema = z.object({
  street: z.string().trim().min(3, "street"),
  postcode: z.string().trim().regex(/^\d{5}$/, "postcode"),
  city: z.string().trim().min(2, "city"),
  meterId: z.string().transform(normaliseMaloId).refine(isValidMaloId, "meter_format"),
  pvKwp: number("pv", 0, 100),
  batteryKwh: number("battery", 0, 100),
  evChargerKw: number("ev", 0, 22),
  annualKwh: number("use", 500, 500_000),
});
export type SiteForm = z.infer<typeof siteFormSchema>;

export const openSiteOf = (memberId: string) =>
  db.select().from(sites).where(and(eq(sites.memberId, memberId), isNull(sites.closedAt))).get() ?? null;

export const registrationsOf = (memberId: string) =>
  db.select().from(siteRegistrations).where(eq(siteRegistrations.memberId, memberId)).orderBy(desc(siteRegistrations.createdAt)).all();

// Register a household's or business's meter. Form mistakes are thrown before anything is stored;
// everything after that is recorded, so a rejection and its reason stay visible.
export async function registerSite(member: Member, form: SiteForm, operator: GridOperator = demoGridOperator): Promise<SiteRegistration> {
  if (member.kind !== "household" && member.kind !== "sme") throw new UserError("wrong_kind");
  if (openSiteOf(member.id)) throw new UserError("has_site");
  const meterTaken = db.select().from(sites).where(and(eq(sites.meterId, form.meterId), isNull(sites.closedAt))).get();
  if (meterTaken) throw new UserError("meter_taken");
  const community = db.select().from(schema.communities).get();
  if (!community) throw new Error("No community found.");

  const registration: SiteRegistration = {
    id: `reg-${randomUUID().slice(0, 8)}`,
    memberId: member.id,
    ...form,
    status: "pending",
    reason: null,
    gridAreaId: null,
    siteId: null,
    createdAt: Date.now(),
    decidedAt: null,
  };
  db.insert(siteRegistrations).values(registration).run();

  // Ask the grid operator. The demo answers at once; a real operator answers later and this
  // part would run in the worker when its message arrives.
  const location = await operator.lookupMarketLocation(form.meterId);
  const decision = decideSite(form, location, community.gridAreaId);
  const decided = { decidedAt: Date.now(), gridAreaId: location?.gridAreaId ?? null };

  if (!decision.approved) {
    const reason = JSON.stringify(decision.reason); // a code and its facts, worded when shown
    db.update(siteRegistrations).set({ ...decided, status: "rejected", reason }).where(eq(siteRegistrations.id, registration.id)).run();
    return { ...registration, ...decided, status: "rejected", reason };
  }

  const siteId = siteIdFor(member.id);
  const { location: l } = decision;
  db.transaction((tx) => {
    tx.insert(sites)
      .values({
        id: siteId,
        memberId: member.id,
        communityId: community.id,
        label: l.street,
        address: `${l.street}, ${l.postcode} ${l.city}`,
        meterId: form.meterId,
        gridAreaId: l.gridAreaId,
        lat: l.lat, // the grid operator's location, not a guess from the typed address
        lon: l.lon,
        pvKwp: form.pvKwp,
        batteryKwh: form.batteryKwh,
        evChargerKw: form.evChargerKw,
        loadProfile: member.kind === "sme" ? "business" : "household",
        annualKwh: form.annualKwh,
      })
      .run();
    tx.update(siteRegistrations).set({ ...decided, status: "approved", siteId }).where(eq(siteRegistrations.id, registration.id)).run();
  });
  return { ...registration, ...decided, status: "approved", siteId };
}

export const parseRejection = (reason: string | null): RejectionReason | null => {
  if (!reason) return null;
  try {
    return JSON.parse(reason) as RejectionReason;
  } catch {
    return null;
  }
};
