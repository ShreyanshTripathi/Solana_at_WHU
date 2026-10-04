import { getCurrentMember } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { transcribe } from "@/lib/voice/models";

export const dynamic = "force-dynamic";

const MAX_SECONDS = 30;

// POST /api/voice/stt?lang=de with 16 kHz mono float32 samples (the browser resamples the recording).
// Returns { text }. Speech is transcribed on this server by Whisper; nothing is sent elsewhere.
export async function POST(request: Request) {
  if (!(await getCurrentMember())) return Response.json({ error: "Log in first." }, { status: 401 });
  const lang = new URL(request.url).searchParams.get("lang");
  const locale = isLocale(lang) ? lang : await getLocale();
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength % 4 !== 0 || bytes.byteLength > MAX_SECONDS * 16_000 * 4) {
    return Response.json({ error: `Send up to ${MAX_SECONDS} s of 16 kHz float32 audio.` }, { status: 400 });
  }
  try {
    return Response.json({ text: await transcribe(new Float32Array(bytes), locale) });
  } catch (e) {
    console.error("speech to text failed", e);
    return Response.json({ error: "voice" }, { status: 503 });
  }
}
