import {
  type Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { loadKeypair } from "./wallets";

// Client for the roof-split program (programs/roof-split): every payment to a funded roof goes
// through it, and it splits the money by the roof's terms stored on-chain.

export const roofSplitProgramId = (): PublicKey | null => {
  if (process.env.ROOF_SPLIT_PROGRAM_ID)
    return new PublicKey(process.env.ROOF_SPLIT_PROGRAM_ID);
  return loadKeypair("roof-split-program")?.publicKey ?? null;
};

// The on-chain id of a project's roof. ROOF_ID_PREFIX keeps test runs on database copies apart from
// the live roofs (both are paid by the same Stadtwerk).
export const roofId = (projectId: string) =>
  `${process.env.ROOF_ID_PREFIX ?? ""}${projectId}`;

// One roof per (Stadtwerk, roof id).
export const roofAddress = (
  programId: PublicKey,
  authority: PublicKey,
  projectId: string,
) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("roof"), authority.toBuffer(), Buffer.from(roofId(projectId))],
    programId,
  )[0];

export interface RoofTerms {
  feeBps: number;
  reserveBps: number;
  investorShareBps: number;
  owedTotalMicro: number;
  repaidMicro: number;
  reserveMicro: number;
  reserveTargetMicro: number;
}

export interface RoofPayees {
  fee: PublicKey; // wallet owners; the program stores their token accounts
  reserve: PublicKey;
  host: PublicKey;
  investors: { owner: PublicKey; weight: number }[];
}

const u16 = (x: number) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(x);
  return b;
};
const u64 = (x: number) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(x));
  return b;
};

export function initRoofInstruction(
  programId: PublicKey,
  authority: PublicKey,
  mint: PublicKey,
  projectId: string,
  terms: RoofTerms,
  payees: RoofPayees,
) {
  const ata = (owner: PublicKey) => getAssociatedTokenAddressSync(mint, owner);
  const id = Buffer.from(roofId(projectId));
  if (id.length === 0 || id.length > 32)
    throw new Error("A roof id has 1 to 32 bytes.");
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      {
        pubkey: roofAddress(programId, authority, projectId),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: ata(payees.fee), isSigner: false, isWritable: false },
      { pubkey: ata(payees.reserve), isSigner: false, isWritable: false },
      { pubkey: ata(payees.host), isSigner: false, isWritable: false },
      ...payees.investors.map((i) => ({
        pubkey: ata(i.owner),
        isSigner: false,
        isWritable: false,
      })),
    ],
    data: Buffer.concat([
      Buffer.from([0, id.length]),
      id,
      u16(terms.feeBps),
      u16(terms.reserveBps),
      u16(terms.investorShareBps),
      u64(terms.owedTotalMicro),
      u64(terms.repaidMicro),
      u64(terms.reserveMicro),
      u64(terms.reserveTargetMicro),
      Buffer.from([payees.investors.length]),
      ...payees.investors.map((i) => u64(i.weight)),
    ]),
  });
}

export interface RoofState extends RoofTerms {
  authority: PublicKey;
  mint: PublicKey;
  feeAccount: PublicKey;
  reserveAccount: PublicKey;
  hostAccount: PublicKey;
  investors: { account: PublicKey; weight: number }[];
}

// The layout written by the program (see O_* in lib.rs).
export function decodeRoof(data: Buffer): RoofState {
  const key = (o: number) => new PublicKey(data.subarray(o, o + 32));
  const n = data[200];
  return {
    authority: key(2),
    mint: key(34),
    feeBps: data.readUInt16LE(66),
    reserveBps: data.readUInt16LE(68),
    investorShareBps: data.readUInt16LE(70),
    owedTotalMicro: Number(data.readBigUInt64LE(72)),
    repaidMicro: Number(data.readBigUInt64LE(80)),
    reserveMicro: Number(data.readBigUInt64LE(88)),
    reserveTargetMicro: Number(data.readBigUInt64LE(96)),
    feeAccount: key(104),
    reserveAccount: key(136),
    hostAccount: key(168),
    investors: Array.from({ length: n }, (_, i) => ({
      account: key(201 + i * 40),
      weight: Number(data.readBigUInt64LE(201 + i * 40 + 32)),
    })),
  };
}

export async function readRoof(
  connection: Connection,
  address: PublicKey,
): Promise<RoofState | null> {
  const info = await connection.getAccountInfo(address, "confirmed");
  return info ? decodeRoof(info.data) : null;
}

export const MAX_SALES_PER_PAY = 32;

// `payer` signs as the owner or approved delegate of `source`; each sale is split in order.
export function payInstruction(
  programId: PublicKey,
  roof: PublicKey,
  state: RoofState,
  payer: PublicKey,
  source: PublicKey,
  salesMicro: number[],
) {
  if (salesMicro.length === 0 || salesMicro.length > MAX_SALES_PER_PAY)
    throw new Error("1 to 32 sales per payment.");
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: false },
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: roof, isSigner: false, isWritable: true },
      { pubkey: state.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: state.feeAccount, isSigner: false, isWritable: true },
      { pubkey: state.reserveAccount, isSigner: false, isWritable: true },
      { pubkey: state.hostAccount, isSigner: false, isWritable: true },
      ...state.investors.map((i) => ({
        pubkey: i.account,
        isSigner: false,
        isWritable: true,
      })),
    ],
    data: Buffer.concat([
      Buffer.from([1, salesMicro.length]),
      ...salesMicro.map(u64),
    ]),
  });
}
