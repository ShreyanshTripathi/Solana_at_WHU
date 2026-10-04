// Fills in address, meter ID and grid area for demo sites created before site registration existed,
// without wiping the database (unlike `npm run seed`). Safe to run again.
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { demoSiteDetails, PERSONAS, siteIdFor } from "@/lib/demo/personas";

let updated = 0;
for (const p of PERSONAS.filter((x) => x.site)) {
  const { address, meterId, gridAreaId } = demoSiteDetails(p);
  updated += db
    .update(schema.sites)
    .set({ address, meterId, gridAreaId })
    .where(and(eq(schema.sites.id, siteIdFor(p.id)), isNull(schema.sites.meterId)))
    .run().changes;
}
console.log(`Filled in ${updated} demo sites. Sites that already had a meter ID were left alone.`);
