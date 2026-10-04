// Gives each demo persona a login account and its role, without wiping the database (unlike `npm run seed`).
// Run once after `npm run db:push` on a database seeded before logins existed. Safe to run again.
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { demoAccounts, demoRoleFor, PERSONAS } from "@/lib/demo/personas";

let created = 0;
db.transaction((tx) => {
  for (const p of PERSONAS) tx.update(schema.members).set({ role: demoRoleFor(p) }).where(eq(schema.members.id, p.id)).run();
  for (const { account, link } of demoAccounts(Date.now())) {
    if (!tx.select().from(schema.members).where(eq(schema.members.id, link.memberId)).get()) continue;
    created += tx.insert(schema.accounts).values(account).onConflictDoNothing().run().changes;
    tx.insert(schema.accountWorkspaces).values(link).onConflictDoNothing().run();
  }
});
console.log(`Created ${created} demo logins. Existing accounts were left alone.`);
