// Creates demo wallets, the tEURC test token and token accounts on Solana devnet.
// Safe to re-run: existing keys, the mint and token accounts are reused.
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { MICRO_PER_EUR, TOKEN } from "@/lib/config";
import { walletNames } from "@/lib/demo/personas";
import { getConnection, loadOrCreateKeypair, readDevnetConfig, toPublicKey, writeDevnetConfig } from "@/lib/solana/wallets";

const TREASURY_FLOAT_EUR = 100_000;
const MIN_TREASURY_SOL = 0.1;

async function main() {
  const connection = getConnection();
  const names = walletNames();
  const keypairs = Object.fromEntries(names.map((n) => [n, loadOrCreateKeypair(n)]));
  const treasury = keypairs.stadtwerk;
  console.log(`Treasury (Stadtwerk) wallet: ${treasury.publicKey.toBase58()}`);

  let balance = await connection.getBalance(treasury.publicKey);
  if (balance < MIN_TREASURY_SOL * LAMPORTS_PER_SOL) {
    try {
      console.log("Requesting a devnet airdrop of 1 SOL...");
      const signature = await connection.requestAirdrop(treasury.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature, "confirmed");
      balance = await connection.getBalance(treasury.publicKey);
    } catch (e) {
      console.error(`Airdrop failed (${e instanceof Error ? e.message : e}).`);
      console.error(`Fund the treasury at https://faucet.solana.com with ${treasury.publicKey.toBase58()}, then re-run.`);
      process.exit(1);
    }
  }
  console.log(`Treasury balance: ${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL`);

  const existing = readDevnetConfig();
  const mint = existing?.mint
    ? toPublicKey(existing.mint)
    : await createMint(connection, treasury, treasury.publicKey, null, TOKEN.decimals);
  console.log(`${TOKEN.symbol} mint: ${mint.toBase58()}`);

  // The treasury pays the rent for every token account, so members never need SOL.
  for (const name of names) {
    await getOrCreateAssociatedTokenAccount(connection, treasury, mint, keypairs[name].publicKey);
  }
  const treasuryAccount = await getOrCreateAssociatedTokenAccount(connection, treasury, mint, treasury.publicKey);
  const float = BigInt(TREASURY_FLOAT_EUR * MICRO_PER_EUR);
  if (treasuryAccount.amount < float / BigInt(2)) {
    await mintTo(connection, treasury, mint, treasuryAccount.address, treasury, float);
    console.log(`Minted ${TREASURY_FLOAT_EUR.toLocaleString("en")} ${TOKEN.symbol} to the treasury.`);
  }

  writeDevnetConfig({
    cluster: "devnet",
    mint: mint.toBase58(),
    treasury: treasury.publicKey.toBase58(),
    wallets: Object.fromEntries(names.map((n) => [n, keypairs[n].publicKey.toBase58()])),
  });
  console.log(`Saved data/devnet.json. Mint on the explorer: https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
