"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";
import { assertCanActFor } from "@/lib/auth/policy";
import { requireMember } from "@/lib/auth/session";
import { PRICES } from "@/lib/config";

// Saves FR-SEL-07 selling rules: minimum price, the battery's evening reserve and priority buyers.
// They apply to intervals matched after the change.
export async function saveSellerRules(formData: FormData) {
  const memberId = assertCanActFor(await requireMember("/seller"), String(formData.get("memberId") ?? ""));
  const minPriceCt = Number(formData.get("minPriceCt"));
  const priorityBuyers = formData.getAll("priorityBuyers").map(String);
  if (!memberId || !Number.isFinite(minPriceCt) || minPriceCt < 0 || minPriceCt > PRICES.gridCt) {
    throw new Error("Minimum price must be between 0 and the grid price.");
  }
  // The reserve can't exceed the battery; without a battery it stays 0.
  const site = db.select().from(schema.sites).where(and(eq(schema.sites.memberId, memberId), isNull(schema.sites.closedAt))).get();
  const capacity = site?.batteryKwh ?? 0;
  const reserveInput = Number(formData.get("batteryReserveKwh") ?? capacity);
  if (!Number.isFinite(reserveInput) || reserveInput < 0) throw new Error("The battery reserve can't be negative.");
  const batteryReserveKwh = Math.min(capacity, reserveInput);

  db.insert(schema.sellerRules)
    .values({ memberId, minPriceCt, batteryReserveKwh, priorityBuyers })
    .onConflictDoUpdate({ target: schema.sellerRules.memberId, set: { minPriceCt, batteryReserveKwh, priorityBuyers } })
    .run();
  revalidatePath("/seller");
}
