import {
  type Connection,
  type Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { SOLANA, TOKEN } from "@/lib/config";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

export interface Payout {
  owner: PublicKey; // recipient wallet: a demo wallet from setup, or a member's embedded wallet
  amountMicro: number;
}

export const memoInstruction = (text: string) =>
  new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(text, "utf8"),
  });

const ACCOUNTS_PER_SETUP_TX = 6;

// A member's new embedded wallet has no token account yet. The treasury creates the missing
// ones (and pays their rent) in separate transactions, so payout transactions stay small.
export async function ensureTokenAccounts(
  connection: Connection,
  treasury: Keypair,
  mint: PublicKey,
  owners: PublicKey[],
) {
  const atas = owners.map((owner) =>
    getAssociatedTokenAddressSync(mint, owner),
  );
  const infos = await connection.getMultipleAccountsInfo(atas);
  const missing = owners.filter((_, i) => infos[i] === null);
  for (let i = 0; i < missing.length; i += ACCOUNTS_PER_SETUP_TX) {
    const tx = new Transaction();
    for (const owner of missing.slice(i, i + ACCOUNTS_PER_SETUP_TX)) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          treasury.publicKey,
          getAssociatedTokenAddressSync(mint, owner),
          owner,
          mint,
        ),
      );
    }
    await sendAndConfirmTransaction(connection, tx, [treasury]);
  }
}

const SEND_CONCURRENCY = Number(process.env.SEND_CONCURRENCY ?? 3);

// Sends an hour's transactions at the same time rather than one after another: each moves different
// money, so their order doesn't matter, and the hour takes about one confirmation instead of one per
// transaction. Each chunk is reported as soon as it confirms; if any failed, the first error is
// thrown once all have finished, so the confirmed ones are still recorded. Signatures keep chunk order.
export async function sendConcurrently<T>(
  chunks: T[][],
  send: (chunk: T[], index: number) => Promise<string>,
  onSent?: (chunk: T[], signature: string) => void,
): Promise<string[]> {
  // A few at a time: the public devnet server answers "too many requests" (and makes us wait) beyond that.
  const results: PromiseSettledResult<string>[] = new Array(chunks.length);
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const i = next++;
      try {
        const signature = await send(chunks[i], i);
        onSent?.(chunks[i], signature);
        results[i] = { status: "fulfilled", value: signature };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(SEND_CONCURRENCY, chunks.length) }, worker));
  const failed = results.find((r) => r.status === "rejected");
  if (failed) throw failed.reason;
  return results.map((r) => (r as PromiseFulfilledResult<string>).value);
}

export const chunksOf = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

// The supplier's treasury pays everyone owed money for a period.
// Each transaction carries a memo with the batch id and allocation hash, so any
// member can check the on-chain payment against the published allocation.
export async function sendPayouts(
  connection: Connection,
  treasury: Keypair,
  mint: PublicKey,
  payouts: Payout[],
  memo: string,
  onSent?: (chunk: Payout[], signature: string) => void, // called after each confirmed transaction
): Promise<string[]> {
  const source = getAssociatedTokenAddressSync(mint, treasury.publicKey);
  const nonZero = payouts.filter((p) => p.amountMicro > 0);
  await ensureTokenAccounts(
    connection,
    treasury,
    mint,
    nonZero.map((p) => p.owner),
  );

  const chunks = chunksOf(nonZero, SOLANA.transfersPerTx);
  return sendConcurrently(
    chunks,
    (chunk, i) => {
      const part = `${i + 1}/${chunks.length}`;
      const tx = new Transaction().add(memoInstruction(`${memo} part ${part}`));
      for (const p of chunk) {
        const destination = getAssociatedTokenAddressSync(mint, p.owner);
        tx.add(
          createTransferCheckedInstruction(
            source,
            mint,
            destination,
            treasury.publicKey,
            BigInt(p.amountMicro),
            TOKEN.decimals,
          ),
        );
      }
      return sendAndConfirmTransaction(connection, tx, [treasury]);
    },
    onSent,
  );
}
