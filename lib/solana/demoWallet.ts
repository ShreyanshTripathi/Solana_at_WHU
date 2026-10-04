import "server-only";
import {
  getAssociatedTokenAddressSync,
  transferChecked,
} from "@solana/spl-token";
import { MICRO_PER_EUR, TOKEN } from "@/lib/config";
import { approveSpending, revokeSpending, walletStatus } from "./p2p";
import {
  getConnection,
  loadKeypair,
  readDevnetConfig,
  toPublicKey,
} from "./wallets";

// Wallet actions for the demo's server-held devnet wallets (personas and demo workspaces). A real
// member signs these in their own wallet; here the server holds the demo keys and signs for them.

const MAX_TOP_UP_EUR = 100;

function demoKeypair(member: { id: string; walletPubkey: string | null }) {
  const key = loadKeypair(member.id);
  return key && member.walletPubkey === key.publicKey.toBase58() ? key : null;
}

export const isServerHeldWallet = (member: {
  id: string;
  walletPubkey: string | null;
}) => demoKeypair(member) !== null;

function setup() {
  const config = readDevnetConfig();
  const treasury = loadKeypair("stadtwerk");
  if (!config || !treasury)
    throw new Error("Devnet isn't set up. Run npm run setup:devnet.");
  return {
    connection: getConnection(),
    mint: toPublicKey(config.mint),
    treasury,
  };
}

export async function walletStatusOf(member: { walletPubkey: string | null }) {
  const config = readDevnetConfig();
  if (!config || !member.walletPubkey) return null;
  try {
    return await walletStatus(
      getConnection(),
      toPublicKey(config.mint),
      toPublicKey(member.walletPubkey),
    );
  } catch {
    return null; // devnet unreachable: the page still renders
  }
}

// Stands in for buying EURC: the Stadtwerk's devnet treasury sends test euros to the wallet.
export async function topUpDemoWallet(
  member: { id: string; walletPubkey: string | null },
  eur: number,
) {
  if (!demoKeypair(member) || !member.walletPubkey)
    throw new Error("Only demo wallets can be topped up here.");
  const amount = Math.round(
    Math.min(MAX_TOP_UP_EUR, Math.max(1, eur)) * MICRO_PER_EUR,
  );
  const { connection, mint, treasury } = setup();
  const owner = toPublicKey(member.walletPubkey);
  return transferChecked(
    connection,
    treasury,
    getAssociatedTokenAddressSync(mint, treasury.publicKey),
    mint,
    getAssociatedTokenAddressSync(mint, owner),
    treasury,
    BigInt(amount),
    TOKEN.decimals,
  );
}

export async function approveDemoSpending(
  member: { id: string; walletPubkey: string | null },
  eur: number,
) {
  const owner = demoKeypair(member);
  if (!owner)
    throw new Error(
      "Only demo wallets can be approved here; a real wallet signs this itself.",
    );
  const { connection, mint, treasury } = setup();
  return approveSpending(
    connection,
    treasury,
    mint,
    owner,
    Math.round(eur * MICRO_PER_EUR),
  );
}

export async function revokeDemoSpending(member: {
  id: string;
  walletPubkey: string | null;
}) {
  const owner = demoKeypair(member);
  if (!owner) throw new Error("Only demo wallets can be changed here.");
  const { connection, mint, treasury } = setup();
  return revokeSpending(connection, treasury, mint, owner);
}
