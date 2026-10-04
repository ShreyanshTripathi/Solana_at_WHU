import "server-only";

// The demo's language model: an open-weights model served locally by Ollama (no API key, nothing
// leaves the machine). Default Qwen 2.5 7B Instruct (Apache-2.0); any Ollama model works via
// OLLAMA_MODEL. Start it with `ollama serve` and `ollama pull qwen2.5:7b`.

export const ollamaUrl = () => process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
export const ollamaModel = () => process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class ModelUnavailable extends Error {}

export async function modelStatus(): Promise<{ ok: boolean; model: string; reason?: "not_running" | "not_pulled" }> {
  const model = ollamaModel();
  try {
    const res = await fetch(`${ollamaUrl()}/api/tags`, { signal: AbortSignal.timeout(2_000), cache: "no-store" });
    const { models } = (await res.json()) as { models: { name: string }[] };
    const pulled = models.some((m) => m.name === model || m.name === `${model}:latest`);
    return pulled ? { ok: true, model } : { ok: false, model, reason: "not_pulled" };
  } catch {
    return { ok: false, model, reason: "not_running" };
  }
}

// One chat turn. With `schema`, the model's answer is constrained to that JSON schema and parsed.
export async function chat(messages: ChatMessage[], opts: { schema?: object; timeoutMs?: number } = {}): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${ollamaUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel(),
        messages,
        stream: false,
        format: opts.schema,
        options: { temperature: 0.1 },
        keep_alive: "30m",
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
      cache: "no-store",
    });
  } catch (e) {
    throw new ModelUnavailable(e instanceof Error ? e.message : String(e));
  }
  if (!res.ok) throw new ModelUnavailable(`${res.status} ${await res.text()}`);
  const body = (await res.json()) as { message?: { content?: string } };
  return body.message?.content ?? "";
}

// Loads the model into memory so the first real question doesn't wait for it.
export async function warmUp(): Promise<void> {
  await fetch(`${ollamaUrl()}/api/generate`, {
    method: "POST",
    body: JSON.stringify({ model: ollamaModel(), keep_alive: "30m" }),
    signal: AbortSignal.timeout(60_000),
  }).catch(() => undefined);
}
