"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";
import { requireAdmin } from "@/lib/auth/session";
import { PRICES } from "@/lib/config";

// The community price every neighbour pays and earns in fixed-price mode.
export async function saveCommunityPrice(formData: FormData) {
  await requireAdmin();
  const priceCt = Number(formData.get("communityPriceCt"));
  if (!(priceCt >= PRICES.feedInCt && priceCt <= PRICES.gridCt)) {
    throw new Error(`The price must be between the ${PRICES.feedInCt} ct feed-in tariff and the ${PRICES.gridCt} ct grid price.`);
  }
  db.update(schema.communities).set({ communityPriceCt: priceCt }).run();
  revalidatePath("/", "layout");
}

// How the community trades and pays (1a / 1b). Applies to intervals matched and hours settled from now on.
export async function saveMarketSettings(formData: FormData) {
  await requireAdmin();
  const priceMode = formData.get("priceMode") === "auction" ? "auction" : "fixed";
  const settlementMode = formData.get("settlementMode") === "p2p" ? "p2p" : "supplier";
  db.update(schema.communities).set({ priceMode, settlementMode }).run();
  revalidatePath("/", "layout");
}
