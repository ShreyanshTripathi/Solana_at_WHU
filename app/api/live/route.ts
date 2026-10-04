import { getCurrentMember } from "@/lib/auth/session";
import { liveKey } from "@/lib/dashboard/liveKey";

export const dynamic = "force-dynamic";

// GET /api/live: what's new (see liveKey), so open dashboards can redraw the moment an hour is
// settled or the demo changes, and not otherwise.
export async function GET() {
  if (!(await getCurrentMember()))
    return Response.json({ error: "Log in first." }, { status: 401 });
  return Response.json(liveKey(), { headers: { "Cache-Control": "no-store" } });
}
