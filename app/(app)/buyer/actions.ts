"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";
import { assertCanActFor } from "@/lib/auth/policy";
import { requireMember } from "@/lib/auth/session";
import { suggestSpendingLimit } from "@/lib/agents/spending";
import { simClock } from "@/lib/sim/runner";
import { approveDemoSpending, isServerHeldWallet, revokeDemoSpending, topUpDemoWallet } from "@/lib/solana/demoWallet";
import { buildWalletTx, limitMicro, submitWalletTx, type WalletTxKind } from "@/lib/solana/walletApproval";
import { PRICES } from "@/lib/config";

// Saves FR-REC-09 buyer rules. They apply to intervals matched after the change.
export async function saveBuyerRules(formData: FormData) {
  const memberId = assertCanActFor(await requireMember("/buyer"), String(formData.get("memberId") ?? ""));
  const maxPriceCt = Number(formData.get("maxPriceCt"));
  const maxDistanceM = Number(formData.get("maxDistanceM"));
  const preferred = formData.getAll("preferred").map(String);
  const blocked = formData.getAll("blocked").map(String);
  if (!memberId || !Number.isFinite(maxPriceCt) || maxPriceCt < 0 || maxPriceCt > PRICES.gridCt) {
    throw new Error("Maximum price must be between 0 and the grid price.");
  }
  if (!Number.isFinite(maxDistanceM) || maxDistanceM < 100 || maxDistanceM > 20_000) {
    throw new Error("Maximum distance must be between 100 m and 20 km.");
  }

  const values = { maxPriceCt, maxDistanceM, preferred: preferred.filter((p) => !blocked.includes(p)), blocked };
  db.insert(schema.buyerRules)
    .values({ memberId, ...values })
    .onConflictDoUpdate({ target: schema.buyerRules.memberId, set: values })
    .run();
  revalidatePath("/buyer");
}

// Peer-to-peer payments (1a): the member's wallet, spending limit and test-euro balance.
// These act on the open workspace's own wallet only.
export async function topUpWallet(formData: FormData) {
  const member = await requireMember("/buyer");
  await topUpDemoWallet(member, Number(formData.get("amountEur") ?? 25));
  revalidatePath("/buyer");
}

export async function approveWalletSpending(formData: FormData) {
  const member = await requireMember("/buyer");
  const eur = Number(formData.get("limitEur"));
  if (!(eur > 0 && eur <= 500)) throw new Error("The monthly limit must be between €1 and €500.");
  await approveDemoSpending(member, eur);
  revalidatePath("/buyer");
}

export async function revokeWalletSpending() {
  const member = await requireMember("/buyer");
  await revokeDemoSpending(member);
  revalidatePath("/buyer");
}

// The payment agent sets the limit it suggests (computed again here, not taken from the browser).
export async function approveAgentLimit() {
  const member = await requireMember("/buyer");
  const suggestion = suggestSpendingLimit(member.id, simClock());
  if (!suggestion) throw new Error("Not enough history for a suggestion yet.");
  await approveDemoSpending(member, suggestion.limitEur);
  revalidatePath("/buyer");
}

// Real wallets (Privy): the member signs the approval or revocation in the browser; the server only
// prepares the transaction and, after checking it is exactly that one, pays the fee and sends it.
export type WalletTxResult = { ok: true; value: string } | { ok: false; error: string };

async function ownRealWallet() {
  const member = await requireMember("/buyer");
  if (!member.walletPubkey || isServerHeldWallet(member)) throw new Error("This workspace has no wallet of its own.");
  return member.walletPubkey;
}
const result = async (run: () => Promise<string>): Promise<WalletTxResult> => {
  try {
    return { ok: true, value: await run() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

export async function prepareWalletTx(kind: WalletTxKind, limitEur: number): Promise<WalletTxResult> {
  return result(async () => buildWalletTx(kind, await ownRealWallet(), kind === "approve" ? limitMicro(limitEur) : 0));
}

export async function submitWalletTxAction(kind: WalletTxKind, limitEur: number, signedBase64: string): Promise<WalletTxResult> {
  const out = await result(async () => submitWalletTx(kind, await ownRealWallet(), kind === "approve" ? limitMicro(limitEur) : 0, signedBase64));
  if (out.ok) revalidatePath("/buyer");
  return out;
}
