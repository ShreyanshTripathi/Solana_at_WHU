import { demoState } from "@/lib/demo/run";

export const dynamic = "force-dynamic";

// Progress of the live demo, polled by the demo page.
export function GET() {
  return Response.json(demoState());
}
