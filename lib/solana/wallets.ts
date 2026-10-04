import fs from "node:fs";
import path from "node:path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { SOLANA } from "@/lib/config";

// Demo wallets are server-held devnet keypairs in data/keys (git-ignored).
// Production uses non-custodial embedded wallets instead.

const keyPath = (name: string) => path.join(SOLANA.keysDir, `${name}.json`);

export function loadKeypair(name: string): Keypair | null {
  if (!fs.existsSync(keyPath(name))) return null;
  const secret = JSON.parse(fs.readFileSync(keyPath(name), "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export function loadOrCreateKeypair(name: string): Keypair {
  const existing = loadKeypair(name);
  if (existing) return existing;
  const keypair = Keypair.generate();
  fs.mkdirSync(SOLANA.keysDir, { recursive: true });
  fs.writeFileSync(
    keyPath(name),
    JSON.stringify(Array.from(keypair.secretKey)),
    { mode: 0o600 },
  );
  return keypair;
}

export interface DevnetConfig {
  cluster: "devnet";
  mint: string;
  treasury: string; // the supplier's wallet, which pays sellers
  wallets: Record<string, string>; // wallet name -> public key
}

export function readDevnetConfig(): DevnetConfig | null {
  if (!fs.existsSync(SOLANA.devnetFile)) return null;
  return JSON.parse(fs.readFileSync(SOLANA.devnetFile, "utf8")) as DevnetConfig;
}

export function writeDevnetConfig(config: DevnetConfig): void {
  fs.mkdirSync(path.dirname(SOLANA.devnetFile), { recursive: true });
  fs.writeFileSync(SOLANA.devnetFile, JSON.stringify(config, null, 2));
}

export const getConnection = () => new Connection(SOLANA.rpcUrl, "confirmed");

export const explorerTxUrl = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA.cluster}`;

export const explorerAddressUrl = (address: string) =>
  `https://explorer.solana.com/address/${address}?cluster=${SOLANA.cluster}`;

export const toPublicKey = (base58: string) => new PublicKey(base58);
