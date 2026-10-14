"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { requireMember } from "@/lib/auth/session";
import { errorCode } from "@/lib/errors";
import { openGridOperator } from "@/lib/grid/openOperator";
import { isDemoMode } from "@/lib/mode";
import { openSiteOf, registerSite, siteFormSchema } from "@/lib/sites/register";

export interface SiteFormState {
  errors?: string[]; // codes from site.errors in the message files
  values?: Record<string, string>;
}

// Registers the open workspace's site. The grid operator's answer (approved or rejected,
// with the reason) shows on the page afterwards.
export async function registerSiteAction(_previous: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const member = await requireMember("/site");
  const values = Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  const parsed = siteFormSchema.safeParse(values);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))], values };

  let status: string;
  try {
    // The demo checks meters against its stand-in grid operator (and rejects Koblenz); the product
    // copy accepts homes in every area until a real operator connection exists.
    const community = db.select().from(schema.communities).get();
    const operator = isDemoMode() || !community ? undefined : openGridOperator(parsed.data, community.gridAreaId);
    status = (await registerSite(member, parsed.data, operator)).status;
  } catch (e) {
    return { errors: [errorCode(e)], values };
  }
  redirect(`/site?result=${status}`);
}

// FR-SEL-06: show this site's exact location on neighbours' maps, or only the street (the default).
export async function setExactLocation(formData: FormData) {
  const member = await requireMember("/site");
  const site = openSiteOf(member.id);
  if (!site) return;
  db.update(schema.sites)
    .set({ showExactLocation: formData.get("showExactLocation") === "on" })
    .where(eq(schema.sites.id, site.id))
    .run();
  revalidatePath("/site");
}
