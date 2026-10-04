import { z } from "zod";
import { getCurrentMember } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { speak } from "@/lib/voice/models";

export const dynamic = "force-dynamic";

const body = z.object({ text: z.string().min(1).max(1_200), lang: z.string().optional() });

// POST /api/voice/tts { text, lang } -> audio/wav, spoken on this server by a Piper voice.
export async function POST(request: Request) {
  if (!(await getCurrentMember())) return new Response("Log in first.", { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Send { text, lang }.", { status: 400 });
  const locale = isLocale(parsed.data.lang) ? parsed.data.lang : await getLocale();
  try {
    const wav = await speak(parsed.data.text, locale);
    return new Response(wav, { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("text to speech failed", e);
    return new Response("voice", { status: 503 });
  }
}
