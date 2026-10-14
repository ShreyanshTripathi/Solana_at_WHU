"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";
import { assertCanActFor } from "@/lib/auth/policy";
import { requireMember } from "@/lib/auth/session";
import { PRICES } from "@/lib/config";
import { checkSme } from "@/lib/sme";

// FR-SME-01: store the figures and mark the member verified if they meet the EU SME definition.
export async function saveBusinessProfile(formData: FormData) {
  const memberId = assertCanActFor(await requireMember("/sme"), String(formData.get("memberId") ?? ""));
  const member = db.select().from(schema.members).where(eq(schema.members.id, memberId)).get();
  if (member?.kind !== "sme") throw new Error("Only business members have an SME profile.");
  const staff = Number(formData.get("staff"));
  const turnoverEur = Number(formData.get("turnoverEur"));
  const balanceSheetEur = Number(formData.get("balanceSheetEur"));
  if (!memberId || [staff, turnoverEur, balanceSheetEur].some((x) => !Number.isFinite(x) || x < 0)) {
    throw new Error("Enter staff, turnover and balance sheet as non-negative numbers.");
  }

  const values = { staff, turnoverEur, balanceSheetEur, checkedAt: Date.now() };
  db.transaction((tx) => {
    tx.insert(schema.businessProfiles)
      .values({ memberId, ...values })
      .onConflictDoUpdate({ target: schema.businessProfiles.memberId, set: values })
      .run();
    tx.update(schema.members)
      .set({ smeVerified: checkSme(staff, turnoverEur, balanceSheetEur).eligible })
      .where(eq(schema.members.id, memberId))
      .run();
  });
  revalidatePath("/sme");
}

const toMinutes = (hhmm: string) => {
  const match = hhmm.match(/^(\d{2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};

// FR-SME-03: an anchor agreement's window, daily cap and fixed price, checked the same way on create and edit.
function anchorTerms(formData: FormData) {
  const fromMinute = toMinutes(String(formData.get("from") ?? ""));
  const toMinute = toMinutes(String(formData.get("to") ?? ""));
  const maxKwhPerDay = Number(formData.get("maxKwhPerDay"));
  const priceCt = Number(formData.get("priceCt"));
  const weekdaysOnly = formData.get("weekdaysOnly") === "on";

  if (!(fromMinute < toMinute)) throw new Error("The window must start before it ends.");
  if (!Number.isFinite(maxKwhPerDay) || maxKwhPerDay <= 0) throw new Error("The daily cap must be above 0 kWh.");
  if (!(priceCt >= PRICES.feedInCt && priceCt <= PRICES.gridCt)) {
    throw new Error(`The price must be between the ${PRICES.feedInCt} ct feed-in tariff and the ${PRICES.gridCt} ct grid price.`);
  }

  return { fromMinute, toMinute, maxKwhPerDay, priceCt, weekdaysOnly };
}

export async function saveAnchor(formData: FormData) {
  const id = String(formData.get("anchorId") ?? "");
  const me = await requireMember("/sme");
  const anchor = db.select().from(schema.anchorAgreements).where(eq(schema.anchorAgreements.id, id)).get();
  if (!anchor) throw new Error("No such anchor agreement.");
  assertCanActFor(me, anchor.memberId);
  db.update(schema.anchorAgreements).set(anchorTerms(formData)).where(eq(schema.anchorAgreements.id, id)).run();
  revalidatePath("/sme");
}

// A business sets up its own anchor agreement. Matching only serves it while the SME check is valid.
export async function createAnchor(formData: FormData) {
  const memberId = assertCanActFor(await requireMember("/sme"), String(formData.get("memberId") ?? ""));
  const member = db.select().from(schema.members).where(eq(schema.members.id, memberId)).get();
  if (member?.kind !== "sme") throw new Error("Only business members can have an anchor agreement.");
  if (db.select().from(schema.anchorAgreements).where(eq(schema.anchorAgreements.memberId, memberId)).get()) {
    throw new Error("This business already has an anchor agreement.");
  }
  const community = db.select().from(schema.communities).get();
  if (!community) throw new Error("No community found.");
  db.insert(schema.anchorAgreements)
    .values({ id: `anchor-${memberId}`, memberId, communityId: community.id, ...anchorTerms(formData) })
    .run();
  revalidatePath("/sme");
}
