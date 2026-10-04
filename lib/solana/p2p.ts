import {
  createApproveCheckedInstruction,
  createRevokeInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  type Connection,
  type Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { TOKEN } from "@/lib/config";
import {
  chunksOf,
  ensureTokenAccounts,
  memoInstruction,
  sendConcurrently,
} from "./payout";
import { loadOrCreateKeypair } from "./wallets";

// Peer-to-peer settlement (option 1a, Austria's model): buyers pay sellers directly from their own
// wallets. Each buyer approves, once, a spending limit for Volty's settlement key (an SPL token
// "delegate"). Every hour the settlement key moves the money from buyers' token accounts to sellers'.
// It can never take more than the buyer approved, and the buyer can lower or revoke the limit at any time.

export const settlementKey = () => loadOrCreateKeypair("kiezwatt-settlement");
const MIN_SETTLEMENT_SOL = 0.02;
const TOP_UP_SOL = 0.05;
const TRANSFERS_PER_TX = 6; // each transfer brings two token accounts; keeps transactions under the size limit

// The settlement key pays the network fees, so it needs a little SOL; the treasury tops it up on devnet.
export async function ensureSettlementSol(
  connection: Connection,
  funder: Keypair,
): Promise<void> {
  const key = settlementKey().publicKey;
  if (
    (await connection.getBalance(key)) >=
    MIN_SETTLEMENT_SOL * LAMPORTS_PER_SOL
  )
    return;
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: funder.publicKey,
      toPubkey: key,
      lamports: TOP_UP_SOL * LAMPORTS_PER_SOL,
    }),
  );
  await sendAndConfirmTransaction(connection, tx, [funder]);
}

export interface WalletStatus {
  balanceMicro: number;
  approvedMicro: number; // what the settlement key may still spend; 0 if not approved
}

export async function walletStatus(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
): Promise<WalletStatus> {
  try {
    const account = await getAccount(
      connection,
      getAssociatedTokenAddressSync(mint, owner),
    );
    const approved = account.delegate?.equals(settlementKey().publicKey)
      ? Number(account.delegatedAmount)
      : 0;
    return { balanceMicro: Number(account.amount), approvedMicro: approved };
  } catch {
    return { balanceMicro: 0, approvedMicro: 0 }; // no token account yet
  }
}

// The buyer's one-time approval. With a real (Privy) wallet the member signs this in the browser;
// for the demo's server-held wallets the server signs as the member. The settlement key pays the fee.
export async function approveSpending(
  connection: Connection,
  funder: Keypair,
  mint: PublicKey,
  owner: Keypair,
  amountMicro: number,
) {
  await ensureSettlementSol(connection, funder);
  const fee = settlementKey();
  const ata = getAssociatedTokenAddressSync(mint, owner.publicKey);
  const tx = new Transaction().add(
    createApproveCheckedInstruction(
      ata,
      mint,
      fee.publicKey,
      owner.publicKey,
      BigInt(amountMicro),
      TOKEN.decimals,
    ),
  );
  tx.feePayer = fee.publicKey;
  return sendAndConfirmTransaction(connection, tx, [fee, owner]);
}

export async function revokeSpending(
  connection: Connection,
  funder: Keypair,
  mint: PublicKey,
  owner: Keypair,
) {
  await ensureSettlementSol(connection, funder);
  const fee = settlementKey();
  const tx = new Transaction().add(
    createRevokeInstruction(
      getAssociatedTokenAddressSync(mint, owner.publicKey),
      owner.publicKey,
    ),
  );
  tx.feePayer = fee.publicKey;
  return sendAndConfirmTransaction(connection, tx, [fee, owner]);
}

export interface DirectTransfer {
  from: PublicKey; // the buyer's wallet
  to: PublicKey; // seller, investor, reserve or fee wallet
  amountMicro: number;
}

// Moves money straight from buyers to sellers, as the buyers' approved spender. One memo per
// transaction ties it to the hour's allocations, like the supplier payouts.
export async function sendDirectTransfers(
  connection: Connection,
  funder: Keypair,
  mint: PublicKey,
  transfers: DirectTransfer[],
  memo: string,
  onSent?: (chunk: DirectTransfer[], signature: string) => void,
): Promise<string[]> {
  const todo = transfers.filter((t) => t.amountMicro > 0);
  if (todo.length === 0) return [];
  await ensureSettlementSol(connection, funder);
  const authority = settlementKey();
  await ensureTokenAccounts(
    connection,
    authority,
    mint,
    [...new Set(todo.map((t) => t.to.toBase58()))].map((k) => new PublicKey(k)),
  );

  const chunks = chunksOf(todo, TRANSFERS_PER_TX);
  return sendConcurrently(
    chunks,
    (chunk, i) => {
      const tx = new Transaction().add(
        memoInstruction(`${memo} p2p part ${i + 1}/${chunks.length}`),
      );
      for (const t of chunk) {
        tx.add(
          createTransferCheckedInstruction(
            getAssociatedTokenAddressSync(mint, t.from),
            mint,
            getAssociatedTokenAddressSync(mint, t.to),
            authority.publicKey, // the delegate signs, within the buyer's approved limit
            BigInt(t.amountMicro),
            TOKEN.decimals,
          ),
        );
      }
      tx.feePayer = authority.publicKey;
      return sendAndConfirmTransaction(connection, tx, [authority]);
    },
    onSent,
  );
}
