"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";
import { saveAgentSettings } from "@/lib/agents/run";
import { applyRules, explainDecisions, proposeRules } from "@/lib/ai/agent";
import { ModelUnavailable, ollamaModel } from "@/lib/ai/ollama";
import type { Change, Problem } from "@/lib/ai/rules";
import { LIMITS } from "@/lib/ai/rules";
import { requireMember } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/server";

// The agent page's actions. They always act for the open workspace.

export async function saveAgentSwitches(formData: FormData) {
  const member = await requireMember("/agent");
  const ready = Math.round(Number(formData.get("evReadyByHour") ?? 7));
  const [lo, hi] = LIMITS.evReadyByHour;
  saveAgentSettings(member.id, {
    smartBattery: formData.get("smartBattery") === "on",
    smartEv: formData.get("smartEv") === "on",
    evReadyByHour: Number.isFinite(ready) ? Math.min(hi, Math.max(lo, ready)) : 7,
  });
  db.insert(schema.agentDecisions).values({ memberId: member.id, ts: Date.now(), kind: "rules", params: { fields: "smartBattery,smartEv" } }).run();
  revalidatePath("/agent");
}

export type ProposeResult = { ok: true; changes: Change[]; problems: Problem[]; summary: string } | { ok: false; error: "model" | "empty" };

export async function proposeAction(text: string): Promise<ProposeResult> {
  const member = await requireMember("/agent");
  if (!text.trim()) return { ok: false, error: "empty" };
  try {
    const proposal = await proposeRules(member.id, text, await getLocale());
    return { ok: true, ...proposal };
  } catch (e) {
    if (e instanceof ModelUnavailable) {
      console.error("language model:", e.message);
      return { ok: false, error: "model" };
    }
    throw e;
  }
}

export async function applyAction(changes: { field: string; to: unknown }[]): Promise<{ applied: number }> {
  const member = await requireMember("/agent");
  const result = applyRules(member.id, changes);
  revalidatePath("/agent");
  return { applied: result.changes.length };
}

export async function explainAction(): Promise<{ text: string; byModel: boolean; model: string }> {
  const member = await requireMember("/agent");
  return { ...(await explainDecisions(member.id, await getLocale())), model: ollamaModel() };
}
