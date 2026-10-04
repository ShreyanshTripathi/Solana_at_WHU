// Central constants for the demo. Prices are in euro cents per kWh.

export const INTERVAL_MINUTES = 15;
export const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;
export const INTERVALS_PER_HOUR = 60 / INTERVAL_MINUTES;

export const PRICES = {
  communityCt: 20, // fixed community price for the MVP
  feedInCt: 8, // what a seller gets from the grid instead
  gridCt: 38, // what a buyer pays their utility instead
};

// Token amounts are stored as integer micro-euros, matching tEURC's 6 decimals.
export const TOKEN = { symbol: "tEURC", decimals: 6 };
export const MICRO_PER_EUR = 1_000_000;
export const MICRO_PER_CT = 10_000;

export const COMMUNITY = {
  id: "vallendar",
  name: "Vallendar Energy Sharing (demo)",
  gridAreaId: "DE-DEMO-VALLENDAR",
  lat: 50.401,
  lon: 7.622,
  timeZone: "Europe/Berlin",
};

// A scripted cloud so the switching demo has something to react to.
export const CLOUD_EVENT = { fromHour: 14, toHour: 15.5, clearness: 0.25 };

export const SOLANA = {
  rpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  cluster: "devnet" as const,
  keysDir: "data/keys",
  devnetFile: "data/devnet.json",
  transfersPerTx: 12, // keeps each payout transaction under the 1,232-byte limit
};

export const DATABASE_PATH = process.env.DATABASE_PATH ?? "data/kiezwatt.db";
