"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";
import { requireAdmin } from "@/lib/auth/session";
import { ensurePeers } from "@/lib/federation/run";

// Stadtwerk staff switch the federation on and choose, per community, paid trades or energy credits.
export async function setFederation(formData: FormData) {
  await requireAdmin("/federation");
  const enabled = formData.get("enabled") === "on";
  if (enabled) ensurePeers();
  db.update(schema.communities).set({ federationEnabled: enabled }).run();
  revalidatePath("/federation");
}

export async function setPeerMode(formData: FormData) {
  await requireAdmin("/federation");
  const peerId = String(formData.get("peerId") ?? "");
  const mode = formData.get("mode") === "credit" ? "credit" : "trade";
  const active = formData.get("active") === "on";
  db.update(schema.federationPeers).set({ mode, active }).where(eq(schema.federationPeers.id, peerId)).run();
  revalidatePath("/federation");
}
