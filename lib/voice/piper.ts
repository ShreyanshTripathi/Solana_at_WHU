import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Locale } from "@/lib/i18n/config";

// Text to speech with Piper voices (VITS models, run with ONNX Runtime) and eSpeak NG, which turns
// the text into the sounds the voice was trained on. Both open source:
//  - German: Thorsten (de_DE-thorsten-medium), CC0;
//  - English: LibriTTS-R (en_US-libritts_r-medium, speaker 20), CC BY 4.0;
//  - eSpeak NG (GPL-3.0) as WebAssembly, so nothing needs installing.
// The voices download once from Hugging Face (rhasspy/piper-voices) into data/models/piper.

const VOICES: Record<Locale, { name: string; path: string; speaker: number }> = {
  de: { name: "de_DE-thorsten-medium", path: "de/de_DE/thorsten/medium", speaker: 0 },
  en: { name: "en_US-libritts_r-medium", path: "en/en_US/libritts_r/medium", speaker: 20 },
};
const DIR = () => path.join(process.cwd(), "data", "models", "piper");
const SOURCE = "https://huggingface.co/rhasspy/piper-voices/resolve/main";

interface VoiceConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  num_speakers: number;
  phoneme_id_map: Record<string, number[]>;
}

type Ort = typeof import("onnxruntime-node");
interface Voice {
  ort: Ort;
  session: import("onnxruntime-node").InferenceSession;
  config: VoiceConfig;
  speaker: number;
}

const store = globalThis as unknown as { kiezwattPiper?: Map<Locale, Promise<Voice>> };
const voices = (store.kiezwattPiper ??= new Map());

async function download(file: string, url: string) {
  if (fs.existsSync(file)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Downloading ${url}: ${res.status}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.part`, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(`${file}.part`, file);
}

function voice(locale: Locale): Promise<Voice> {
  if (!voices.has(locale)) {
    const v = VOICES[locale];
    const file = path.join(DIR(), `${v.name}.onnx`);
    const p = (async () => {
      await download(file, `${SOURCE}/${v.path}/${v.name}.onnx`);
      await download(`${file}.json`, `${SOURCE}/${v.path}/${v.name}.onnx.json`);
      const ort = await import("onnxruntime-node");
      const session = await ort.InferenceSession.create(file);
      return { ort, session, config: JSON.parse(fs.readFileSync(`${file}.json`, "utf8")) as VoiceConfig, speaker: v.speaker };
    })();
    p.catch(() => voices.delete(locale));
    voices.set(locale, p);
  }
  return voices.get(locale)!;
}

// eSpeak NG: text -> IPA phonemes, one line per sentence.
async function phonemes(text: string, espeakVoice: string): Promise<string[]> {
  const { default: ESpeakNg } = await import("espeak-ng");
  const espeak = await ESpeakNg({ arguments: ["--phonout", "out", "-q", "-b", "1", "--ipa=3", "-v", espeakVoice, text] });
  return espeak.FS.readFile("out", { encoding: "utf8" })
    .replace(/‍/g, "")
    .split("\n")
    .filter((l) => l.trim());
}

// Text -> mono samples at the voice's sample rate (22.05 kHz).
export async function synthesize(text: string, locale: Locale): Promise<{ audio: Float32Array; sampleRate: number }> {
  const { ort, session, config, speaker } = await voice(locale);
  const map = config.phoneme_id_map;
  const pause = new Float32Array(Math.round(config.audio.sample_rate * 0.25));
  const chunks: Float32Array[] = [];
  for (const line of await phonemes(text, config.espeak.voice)) {
    const ids = [...map["^"]];
    for (const ch of line) if (map[ch]) ids.push(...map[ch], ...map["_"]);
    ids.push(...map["$"]);
    const feeds: Record<string, import("onnxruntime-node").Tensor> = {
      input: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor("float32", Float32Array.from([config.inference.noise_scale, config.inference.length_scale, config.inference.noise_w]), [3]),
    };
    if (config.num_speakers > 1) feeds.sid = new ort.Tensor("int64", BigInt64Array.from([BigInt(speaker)]), [1]);
    const out = await session.run(feeds);
    chunks.push(out[session.outputNames[0]].data as Float32Array, pause);
  }
  const audio = new Float32Array(chunks.reduce((s, c) => s + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    audio.set(c, offset);
    offset += c.length;
  }
  return { audio, sampleRate: config.audio.sample_rate };
}

export function warmPiper(): void {
  for (const locale of Object.keys(VOICES) as Locale[]) void voice(locale).catch(() => undefined);
}
