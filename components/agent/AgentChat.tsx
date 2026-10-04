"use client";

import { useRef, useState, useTransition } from "react";
import { applyAction, explainAction, proposeAction, type ProposeResult } from "@/app/agent/actions";
import type { Change, Problem, Value } from "@/lib/ai/rules";
import { useI18n } from "@/lib/i18n/client";

const button = "rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10";
const primary = "rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";
const MAX_RECORD_MS = 25_000;
const SILENCE_RMS = 0.003; // Whisper invents words ("you") from silence, so silence isn't sent

class Silence extends Error {}

// Plays text in the interface language with the server's open-source voice.
export function SpeakButton({ text }: { text: string }) {
  const { m, locale } = useI18n();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  async function play() {
    if (state === "playing") {
      audio.current?.pause();
      setState("idle");
      return;
    }
    setState("loading");
    setError(false);
    try {
      const res = await fetch("/api/voice/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang: locale }) });
      if (!res.ok) throw new Error(await res.text());
      const url = URL.createObjectURL(await res.blob());
      audio.current = new Audio(url);
      audio.current.onended = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };
      await audio.current.play();
      setState("playing");
    } catch {
      setError(true);
      setState("idle");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={play} disabled={state === "loading"} className={button}>
        {state === "loading" ? m.agent.speaking : state === "playing" ? m.agent.stop : m.agent.listen}
      </button>
      {error && <span className="text-xs text-red-600">{m.agent.errors.voice}</span>}
    </span>
  );
}

// Records from the microphone and returns 16 kHz mono samples for Whisper.
async function record(stopSignal: Promise<void>): Promise<Float32Array> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const parts: Blob[] = [];
  recorder.ondataavailable = (e) => parts.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
  recorder.start();
  await Promise.race([stopSignal, new Promise((r) => setTimeout(r, MAX_RECORD_MS))]);
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  const ctx = new AudioContext({ sampleRate: 16_000 }); // decodeAudioData resamples to this rate
  const decoded = await ctx.decodeAudioData(await new Blob(parts).arrayBuffer());
  await ctx.close();
  return decoded.getChannelData(0);
}

export function AgentChat({ neighbours }: { neighbours: Record<string, string> }) {
  const { m, f, locale } = useI18n();
  const t = m.agent;
  const [text, setText] = useState("");
  const [result, setResult] = useState<ProposeResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [voice, setVoice] = useState<"idle" | "recording" | "transcribing">("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const stopRef = useRef<(() => void) | null>(null);

  const show = (field: Change["field"], v: Value) => {
    if (Array.isArray(v)) return v.length ? v.map((id) => neighbours[id] ?? id).join(", ") : t.none;
    if (typeof v === "boolean") return v ? t.on : t.off;
    if (field === "sellerMinPriceCt" || field === "buyerMaxPriceCt") return f.ct(v);
    if (field === "batteryReserveKwh") return f.kwh(v);
    if (field === "maxDistanceM") return v >= 1000 ? `${f.num(v / 1000)} km` : `${f.int(v)} m`;
    if (field === "evReadyByHour") return t.oclock(v);
    return String(v);
  };
  const problem = (p: Problem) =>
    p.code === "unknown_neighbour" ? t.problems.unknown_neighbour(p.name) : p.code === "unsupported" ? t.problems.unsupported(p.text) : t.problems[p.code];

  function ask(input = text) {
    setApplied(false);
    startTransition(async () => setResult(await proposeAction(input)));
  }

  async function toggleMic() {
    if (voice === "recording") {
      stopRef.current?.();
      return;
    }
    setVoiceError(null);
    try {
      const stop = new Promise<void>((resolve) => (stopRef.current = resolve));
      setVoice("recording");
      const samples = await record(stop);
      if (Math.sqrt(samples.reduce((s, x) => s + x * x, 0) / Math.max(1, samples.length)) < SILENCE_RMS) throw new Silence();
      setVoice("transcribing");
      const res = await fetch(`/api/voice/stt?lang=${locale}`, { method: "POST", body: new Blob([samples.slice().buffer]) });
      const body = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || body.text === undefined) throw new Error(body.error ?? "voice");
      const heard = body.text;
      setText(heard);
      if (heard) ask(heard);
    } catch (e) {
      setVoiceError(e instanceof Silence ? t.errors.silence : e instanceof DOMException && e.name === "NotAllowedError" ? t.errors.mic : t.errors.voice);
    } finally {
      setVoice("idle");
    }
  }

  function apply() {
    if (!result?.ok) return;
    const changes = result.changes.map((c) => ({ field: c.field, to: c.to }));
    startTransition(async () => {
      await applyAction(changes);
      setApplied(true);
      setResult(null);
      setText("");
    });
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={t.placeholder}
        className="w-full rounded-md border border-black/15 bg-transparent p-2 text-sm dark:border-white/20"
      />
      <div className="mt-1 flex flex-wrap gap-2 text-xs">
        {t.examples.map((ex) => (
          <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-black/10 px-2 py-0.5 opacity-80 hover:opacity-100 dark:border-white/15">
            {ex}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => ask()} disabled={pending || voice !== "idle"} className={primary}>
          {pending && !result ? t.thinking : t.ask}
        </button>
        <button type="button" onClick={toggleMic} disabled={pending || voice === "transcribing"} className={button} aria-pressed={voice === "recording"}>
          {voice === "recording" ? t.stop : voice === "transcribing" ? t.transcribing : t.record}
        </button>
        {pending && <span className="text-sm opacity-70">{t.thinking}</span>}
        {voiceError && <span className="text-sm text-red-600">{voiceError}</span>}
      </div>

      {applied && <p className="mt-3 text-sm text-green-700 dark:text-green-400">{t.applied}</p>}
      {result && !result.ok && <p className="mt-3 text-sm text-red-600">{t.errors[result.error]}</p>}
      {result?.ok && (
        <div className="mt-4 rounded-lg border border-blue-600/30 bg-blue-600/5 p-3">
          <h3 className="text-sm font-semibold">{t.proposal}</h3>
          {result.summary && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="italic">“{result.summary}”</span>
              <SpeakButton text={result.summary} />
            </p>
          )}
          {result.changes.length === 0 ? (
            <p className="mt-2 text-sm opacity-80">{t.noChanges}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {result.changes.map((c) => (
                <li key={c.field}>
                  <span className="font-medium">{t.fields[c.field]}</span>: <span className="opacity-60 line-through">{show(c.field, c.from)}</span> → <span className="font-medium">{show(c.field, c.to)}</span>
                  {c.clamped && <span className="text-xs opacity-70"> ({t.clamped})</span>}
                </li>
              ))}
            </ul>
          )}
          {result.problems.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-700 dark:text-amber-400">
              {result.problems.map((p, i) => (
                <li key={i}>{problem(p)}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            {result.changes.length > 0 && (
              <button type="button" onClick={apply} disabled={pending} className={primary}>
                {t.apply}
              </button>
            )}
            <button type="button" onClick={() => setResult(null)} className={button}>
              {t.discard}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExplainPanel() {
  const { m } = useI18n();
  const t = m.agent;
  const [answer, setAnswer] = useState<{ text: string; byModel: boolean; model: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <button type="button" onClick={() => startTransition(async () => setAnswer(await explainAction()))} disabled={pending} className={button}>
        {pending ? t.explaining : t.explain}
      </button>
      {answer && (
        <div className="mt-3 rounded-lg border border-black/10 p-3 text-sm dark:border-white/15">
          <p>{answer.text}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs opacity-70">
            {answer.byModel ? t.byModel(answer.model) : t.plainFacts}
            <SpeakButton text={answer.text} />
          </p>
        </div>
      )}
    </div>
  );
}
