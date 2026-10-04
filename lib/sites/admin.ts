import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";

// The Stadtwerk's view of the latest site registrations and the grid operator's answers.
export const recentRegistrations = (limit = 20) =>
  db
    .select({ registration: schema.siteRegistrations, memberName: schema.members.name })
    .from(schema.siteRegistrations)
    .innerJoin(schema.members, eq(schema.members.id, schema.siteRegistrations.memberId))
    .orderBy(desc(schema.siteRegistrations.createdAt))
    .limit(limit)
    .all()
    .map((r) => ({ ...r.registration, memberName: r.memberName }));
