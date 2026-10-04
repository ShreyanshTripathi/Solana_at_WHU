import "server-only";
import {
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  createApproveCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createRevokeInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { MICRO_PER_EUR, TOKEN } from "@/lib/config";
import { ensureSettlementSol, settlementKey } from "./p2p";
import {
  getConnection,
  loadKeypair,
  readDevnetConfig,
  toPublicKey,
} from "./wallets";

// Approving or revoking the spending limit from the member's own wallet (Privy, in the browser).
// The server builds the transaction, the member signs it in their wallet, and the server checks that
// the signed transaction is exactly the one it built (byte for byte: instructions, amount, accounts)
// before adding the fee payer's signature and sending it. The server never co-signs anything else,
// and only the member's own key can approve or revoke spending from their wallet.

export type WalletTxKind = "approve" | "revoke";
export const MAX_LIMIT_EUR = 500;

function setup() {
  const config = readDevnetConfig();
  const treasury = loadKeypair("stadtwerk");
  if (!config || !treasury)
    throw new Error("Devnet isn't set up. Run npm run setup:devnet.");
  return {
    connection: getConnection(),
    mint: toPublicKey(config.mint),
    treasury,
    feePayer: settlementKey(),
  };
}

function instructions(
  kind: WalletTxKind,
  owner: PublicKey,
  mint: PublicKey,
  feePayer: PublicKey,
  amountMicro: number,
): TransactionInstruction[] {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  return kind === "approve"
    ? [
        // A new wallet has no token account yet; the settlement key creates it (and pays its rent).
        createAssociatedTokenAccountIdempotentInstruction(
          feePayer,
          ata,
          owner,
          mint,
        ),
        createApproveCheckedInstruction(
          ata,
          mint,
          feePayer,
          owner,
          BigInt(amountMicro),
          TOKEN.decimals,
        ),
      ]
    : [createRevokeInstruction(ata, owner)];
}

export const limitMicro = (eur: number) =>
  Math.round(Math.min(MAX_LIMIT_EUR, Math.max(1, eur)) * MICRO_PER_EUR);

// The unsigned transaction for the member's wallet to sign, as base64 (wire format).
export async function buildWalletTx(
  kind: WalletTxKind,
  wallet: string,
  amountMicro = 0,
): Promise<string> {
  const { connection, mint, treasury, feePayer } = setup();
  await ensureSettlementSol(connection, treasury);
  const tx = new Transaction().add(
    ...instructions(
      kind,
      new PublicKey(wallet),
      mint,
      feePayer.publicKey,
      amountMicro,
    ),
  );
  tx.feePayer = feePayer.publicKey;
  tx.recentBlockhash = (
    await connection.getLatestBlockhash("confirmed")
  ).blockhash;
  return tx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");
}

// Checks the member's signed transaction against what we would build, then co-signs and sends it.
export async function submitWalletTx(
  kind: WalletTxKind,
  wallet: string,
  amountMicro: number,
  signedBase64: string,
): Promise<string> {
  const { connection, mint, feePayer } = setup();
  const owner = new PublicKey(wallet);
  const tx = Transaction.from(Buffer.from(signedBase64, "base64"));
  // Rebuild what we would have prepared (same blockhash) and compare the exact bytes that were signed.
  if (!tx.feePayer?.equals(feePayer.publicKey) || !tx.recentBlockhash)
    throw new Error("Unexpected fee payer.");
  const expected = new Transaction().add(
    ...instructions(kind, owner, mint, feePayer.publicKey, amountMicro),
  );
  expected.feePayer = feePayer.publicKey;
  expected.recentBlockhash = tx.recentBlockhash;
  if (!expected.serializeMessage().equals(tx.serializeMessage()))
    throw new Error("The signed transaction isn't the one Volty prepared.");
  const ownerSigned = tx.signatures.find((s) => s.publicKey.equals(owner));
  if (!ownerSigned?.signature) throw new Error("The wallet didn't sign.");
  if (!tx.verifySignatures(false))
    throw new Error("The wallet's signature is invalid.");

  tx.partialSign(feePayer);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    preflightCommitment: "confirmed",
  });
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  return signature;
}
