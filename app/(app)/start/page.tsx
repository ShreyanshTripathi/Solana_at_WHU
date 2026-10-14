import { and, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { homePathFor } from "@/lib/auth/policy";
import { requireAccount } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Where logging in lands: the open workspace's own home page (selling for a household with solar,
// buying for one without, the business page for an SME, the console for the Stadtwerk).
export default async function Start() {
  const { workspace } = await requireAccount("/start");
  const hasSolar =
    workspace !== null &&
    db
      .select({ id: schema.sites.id })
      .from(schema.sites)
      .where(and(eq(schema.sites.memberId, workspace.id), gt(schema.sites.pvKwp, 0)))
      .get() !== undefined;
  redirect(homePathFor(workspace, hasSolar));
}
