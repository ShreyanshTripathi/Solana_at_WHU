import "server-only";
import path from "node:path";
import type { Locale } from "@/lib/i18n/config";
import { synthesize, warmPiper } from "./piper";
import { speechText } from "./text";

// Open-source speech models for the demo, run on this server:
//  - speech to text: Whisper base (OpenAI, MIT), multilingual, quantised (~80 MB), via transformers.js;
//  - text to speech: Piper voices with eSpeak NG (see piper.ts).
// They download once from Hugging Face into data/models and stay in memory afterwards.

const STT_MODEL = "onnx-community/whisper-base";
const WHISPER_LANGUAGE: Record<Locale, string> = { en: "english", de: "german" };

type Transformers = typeof import("@huggingface/transformers");
type Pipe = (input: unknown, opts?: Record<string, unknown>) => Promise<unknown>;

const store = globalThis as unknown as { kiezwattVoice?: Map<string, Promise<Pipe>> };
const loaded = (store.kiezwattVoice ??= new Map());

async function lib(): Promise<Transformers> {
  const t = await import("@huggingface/transformers");
  t.env.cacheDir = path.join(process.cwd(), "data", "models");
  return t;
}

function load(task: "automatic-speech-recognition", model: string, dtype: "q8"): Promise<Pipe> {
  const key = `${task}:${model}`;
  if (!loaded.has(key)) {
    const p = lib().then((t) => t.pipeline(task, model, { dtype }) as unknown as Promise<Pipe>);
    p.catch(() => loaded.delete(key)); // try again next time
    loaded.set(key, p);
  }
  return loaded.get(key)!;
}

// 16 kHz mono samples -> text.
export async function transcribe(samples: Float32Array, locale: Locale): Promise<string> {
  const stt = await load("automatic-speech-recognition", STT_MODEL, "q8");
  const out = (await stt(samples, { language: WHISPER_LANGUAGE[locale], task: "transcribe", chunk_length_s: 30 })) as { text: string };
  return out.text.trim();
}

// Text -> a 16-bit mono WAV file.
export async function speak(text: string, locale: Locale): Promise<Uint8Array<ArrayBuffer>> {
  const { audio, sampleRate } = await synthesize(speechText(text, locale), locale);
  return toWav([audio], sampleRate);
}

function toWav(chunks: Float32Array[], rate: number): Uint8Array<ArrayBuffer> {
  const length = chunks.reduce((s, c) => s + c.length, 0);
  const buf = Buffer.alloc(44 + length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(length * 2, 40);
  let o = 44;
  for (const c of chunks) {
    for (const x of c) {
      buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), o);
      o += 2;
    }
  }
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
}

// Loads the models in the background so the first question in a demo doesn't wait for them.
export function warmVoice(): void {
  void load("automatic-speech-recognition", STT_MODEL, "q8").catch(() => undefined);
  warmPiper();
}
