import { isAdmin, viewedMemberId } from "@/lib/auth/policy";
import { getCurrentMember } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { loadStatement, MONTH_KEY } from "@/lib/statements/load";
import { renderStatementPdf } from "@/lib/statements/pdf";

export const dynamic = "force-dynamic";

// GET /statements/pdf?month=2026-10[&lang=de][&as=<member> for Stadtwerk staff]
// The open workspace's statement as a PDF download, in the interface language unless lang says otherwise.
export async function GET(request: Request) {
  const me = await getCurrentMember();
  if (!me) return new Response("Log in first.", { status: 401 });
  const params = new URL(request.url).searchParams;
  const month = params.get("month") ?? "";
  if (!MONTH_KEY.test(month)) return new Response("Pass ?month=YYYY-MM", { status: 400 });
  const memberId = viewedMemberId(me, isAdmin(me) ? (params.get("as") ?? undefined) : undefined);

  const statement = loadStatement(memberId, month);
  if (!statement) return new Response("No such statement.", { status: 404 });
  const lang = params.get("lang");
  const locale = isLocale(lang) ? lang : await getLocale();
  const pdf = await renderStatementPdf(statement, locale);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kiezwatt-${statement.number.toLowerCase()}-${locale}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
