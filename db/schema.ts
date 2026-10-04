import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Timestamps are UTC milliseconds; `ts` is always the start of a 15-minute interval.
// Money is integer micro-euros (1 EUR = 1,000,000), matching the token's 6 decimals.

// A member is one workspace (a household or a business): its own wallet, ledger, balances and bills.
export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["household", "sme", "investor", "supplier", "platform"] }).notNull(),
    walletPubkey: text("wallet_pubkey"),
    smeVerified: integer("sme_verified", { mode: "boolean" }).notNull().default(false),
    role: text("role", { enum: ["member", "stadtwerk_admin"] }).notNull().default("member"),
    closedAt: integer("closed_at"), // set when the owning account is deleted; records are kept
  },
  (t) => [uniqueIndex("members_wallet_idx").on(t.walletPubkey)],
);

// A login (email one-time code or passkey through Privy). One account can own several workspaces.
export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    email: text("email"), // null for passkey-only logins
    privyUserId: text("privy_user_id"), // null for local demo accounts
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("accounts_email_idx").on(t.email), uniqueIndex("accounts_privy_user_idx").on(t.privyUserId)],
);

export const accountWorkspaces = sqliteTable(
  "account_workspaces",
  {
    accountId: text("account_id").notNull().references(() => accounts.id),
    memberId: text("member_id").notNull().references(() => members.id),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.memberId] })],
);

// One-time codes for demo accounts, which have no Privy login to re-verify with (stored hashed).
export const verificationCodes = sqliteTable("verification_codes", {
  accountId: text("account_id").primaryKey().references(() => accounts.id),
  codeHash: text("code_hash").notNull(),
  expiresAt: integer("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
});

// Figures behind the SME eligibility check (FR-SME-01).
export const businessProfiles = sqliteTable("business_profiles", {
  memberId: text("member_id").primaryKey().references(() => members.id),
  staff: integer("staff").notNull(),
  turnoverEur: integer("turnover_eur").notNull(),
  balanceSheetEur: integer("balance_sheet_eur").notNull(),
  checkedAt: integer("checked_at").notNull(),
});

export const communities = sqliteTable("communities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  gridAreaId: text("grid_area_id").notNull(),
  // fixed: everyone trades at the community price. auction: a clearing price per 15 minutes (1b).
  priceMode: text("price_mode", { enum: ["fixed", "auction"] }).notNull().default("fixed"),
  // supplier: the Stadtwerk pays sellers and bills buyers (Germany, §42c).
  // p2p: buyers pay sellers directly from their wallets within a limit they approved (Austria, 1a).
  settlementMode: text("settlement_mode", { enum: ["supplier", "p2p"] }).notNull().default("supplier"),
  communityPriceCt: real("community_price_ct").notNull(),
  supplierMemberId: text("supplier_member_id").notNull().references(() => members.id),
  // Federation: trade what's left after local matching with other energy communities nearby.
  federationEnabled: integer("federation_enabled", { mode: "boolean" }).notNull().default(false),
});

// An approved meter location. Only sites the grid operator confirmed inside the community's grid area exist here.
export const sites = sqliteTable(
  "sites",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id").notNull().references(() => members.id),
    communityId: text("community_id").notNull().references(() => communities.id),
    closedAt: integer("closed_at"), // closed sites are no longer simulated or matched
    label: text("label").notNull(),
    address: text("address"), // "Höhrer Straße 12, 56179 Vallendar"
    meterId: text("meter_id"), // market location ID (MaLo-ID)
    gridAreaId: text("grid_area_id"), // as the grid operator reported it
    lat: real("lat").notNull(),
    lon: real("lon").notNull(),
    pvKwp: real("pv_kwp").notNull().default(0),
    batteryKwh: real("battery_kwh").notNull().default(0),
    evChargerKw: real("ev_charger_kw").notNull().default(0),
    // Neighbours' maps show this site at street level unless the member opts in to its exact location.
    showExactLocation: integer("show_exact_location", { mode: "boolean" }).notNull().default(false),
    loadProfile: text("load_profile", { enum: ["household", "bakery", "business"] }).notNull(),
    annualKwh: real("annual_kwh").notNull(),
  },
  // A meter belongs to one open site; once a site closes, a new occupant can register it.
  (t) => [uniqueIndex("sites_open_meter_idx").on(t.meterId).where(sql`${t.closedAt} is null`)],
);

// Every attempt to register a site, with the grid operator's answer. Kept when rejected, so
// the member and the Stadtwerk can see why.
export const siteRegistrations = sqliteTable("site_registrations", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().references(() => members.id),
  street: text("street").notNull(),
  postcode: text("postcode").notNull(),
  city: text("city").notNull(),
  meterId: text("meter_id").notNull(),
  pvKwp: real("pv_kwp").notNull(),
  batteryKwh: real("battery_kwh").notNull(),
  evChargerKw: real("ev_charger_kw").notNull(),
  annualKwh: real("annual_kwh").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull(),
  reason: text("reason"),
  gridAreaId: text("grid_area_id"), // filled in from the grid operator's answer
  siteId: text("site_id"),
  createdAt: integer("created_at").notNull(),
  decidedAt: integer("decided_at"),
});

export const intervalReadings = sqliteTable(
  "interval_readings",
  {
    siteId: text("site_id").notNull().references(() => sites.id),
    ts: integer("ts").notNull(),
    generationKwh: real("generation_kwh").notNull(),
    loadKwh: real("load_kwh").notNull(),
    importKwh: real("import_kwh").notNull(),
    exportKwh: real("export_kwh").notNull(),
    socKwh: real("soc_kwh").notNull(),
    quality: text("quality", { enum: ["measured", "estimated"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.ts] })],
);

export const forecasts = sqliteTable(
  "forecasts",
  {
    siteId: text("site_id").notNull().references(() => sites.id),
    ts: integer("ts").notNull(),
    quantity: text("quantity", { enum: ["generation", "load", "soc", "surplus"] }).notNull(),
    p10: real("p10").notNull(),
    p50: real("p50").notNull(),
    p90: real("p90").notNull(),
    modelVersion: text("model_version").notNull(),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.ts, t.quantity] })],
);

export const sellerRules = sqliteTable("seller_rules", {
  memberId: text("member_id").primaryKey().references(() => members.id),
  minPriceCt: real("min_price_ct").notNull(),
  // Charge the battery to this level for the evening, then sell the rest of the surplus. No rule = fill the battery.
  batteryReserveKwh: real("battery_reserve_kwh").notNull().default(0),
  priorityBuyers: text("priority_buyers", { mode: "json" }).$type<string[]>().notNull().default([]),
});

export const buyerRules = sqliteTable("buyer_rules", {
  memberId: text("member_id").primaryKey().references(() => members.id),
  maxPriceCt: real("max_price_ct").notNull(),
  maxDistanceM: real("max_distance_m").notNull(),
  preferred: text("preferred", { mode: "json" }).$type<string[]>().notNull().default([]),
  blocked: text("blocked", { mode: "json" }).$type<string[]>().notNull().default([]),
});

export const anchorAgreements = sqliteTable("anchor_agreements", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().references(() => members.id),
  communityId: text("community_id").notNull().references(() => communities.id),
  weekdaysOnly: integer("weekdays_only", { mode: "boolean" }).notNull(),
  fromMinute: integer("from_minute").notNull(), // local time, minutes after midnight
  toMinute: integer("to_minute").notNull(),
  maxKwhPerDay: real("max_kwh_per_day").notNull(),
  priceCt: real("price_ct").notNull(),
});

export const allocations = sqliteTable(
  "allocations",
  {
    communityId: text("community_id").notNull().references(() => communities.id),
    ts: integer("ts").notNull(),
    sellerSiteId: text("seller_site_id").notNull().references(() => sites.id),
    buyerSiteId: text("buyer_site_id").notNull().references(() => sites.id),
    kwh: real("kwh").notNull(),
    priceCt: real("price_ct").notNull(),
    kind: text("kind", { enum: ["planned", "final"] }).notNull(),
    batchId: text("batch_id"),
  },
  (t) => [primaryKey({ columns: [t.communityId, t.ts, t.sellerSiteId, t.buyerSiteId, t.kind] })],
);

export const switchEvents = sqliteTable("switch_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  buyerSiteId: text("buyer_site_id").notNull().references(() => sites.id),
  ts: integer("ts").notNull(),
  fromSellerSiteId: text("from_seller_site_id").notNull(),
  toSellerSiteId: text("to_seller_site_id").notNull(),
  kwh: real("kwh").notNull(),
  reason: text("reason").notNull(),
});

// Double entry: all entries sharing a txnId sum to zero.
// accountId is a member id, or a system account such as "reserve:weber-roof".
export const ledgerEntries = sqliteTable("ledger_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  txnId: text("txn_id").notNull(),
  accountId: text("account_id").notNull(),
  amountMicro: integer("amount_micro").notNull(), // + credit, - debit
  kind: text("kind", { enum: ["energy", "fee", "reserve", "investor", "host"] }).notNull(),
  intervalTs: integer("interval_ts").notNull(),
  status: text("status", { enum: ["pending", "settled", "failed"] }).notNull().default("pending"),
  batchId: text("batch_id"),
});

export const settlementBatches = sqliteTable("settlement_batches", {
  id: text("id").primaryKey(),
  communityId: text("community_id").notNull().references(() => communities.id),
  periodStart: integer("period_start").notNull(),
  periodEnd: integer("period_end").notNull(),
  allocationHash: text("allocation_hash").notNull(),
  txSignatures: text("tx_signatures", { mode: "json" }).$type<string[]>().notNull().default([]),
  status: text("status", { enum: ["open", "submitted", "confirmed", "simulated", "failed"] }).notNull(),
  mode: text("mode", { enum: ["supplier", "p2p"] }).notNull().default("supplier"),
  createdAt: integer("created_at").notNull(),
});

// Every transfer a batch made: who paid whom, and whether the buyer paid from their own wallet
// (p2p) or the Stadtwerk paid on their behalf. Lets a retried batch skip what was already sent.
export const settlementTransfers = sqliteTable("settlement_transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  batchId: text("batch_id").notNull(),
  fromAccount: text("from_account").notNull(), // ledger account; the supplier's id when the Stadtwerk paid
  toAccount: text("to_account").notNull(),
  amountMicro: integer("amount_micro").notNull(),
  direct: integer("direct", { mode: "boolean" }).notNull(), // true: from the buyer's own wallet
  signature: text("signature"),
});

// The auction's result for each 15-minute interval (price mode "auction").
export const clearingPrices = sqliteTable(
  "clearing_prices",
  {
    communityId: text("community_id").notNull().references(() => communities.id),
    ts: integer("ts").notNull(),
    priceCt: real("price_ct").notNull(),
    supplyKwh: real("supply_kwh").notNull(), // offered in the auction
    demandKwh: real("demand_kwh").notNull(), // bid for
    tradedKwh: real("traded_kwh").notNull(),
  },
  (t) => [primaryKey({ columns: [t.communityId, t.ts] })],
);

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  hostSiteId: text("host_site_id").notNull().references(() => sites.id),
  name: text("name").notNull(),
  principalMicro: integer("principal_micro").notNull(),
  returnBps: integer("return_bps").notNull(), // total agreed return on top of principal
  raisedMicro: integer("raised_micro").notNull().default(0),
  repaidMicro: integer("repaid_micro").notNull().default(0),
  feeBps: integer("fee_bps").notNull(),
  reserveBps: integer("reserve_bps").notNull(),
  reserveMicro: integer("reserve_micro").notNull().default(0),
  reserveTargetMicro: integer("reserve_target_micro").notNull(),
  investorShareBps: integer("investor_share_bps").notNull(),
  fundingDeadline: integer("funding_deadline"), // a funding round not met by then refunds every investor
  state: text("state", {
    enum: ["draft", "funding", "funded", "installed", "repaying", "paid_off", "refunded"],
  }).notNull(),
});

export const investments = sqliteTable("investments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  investorMemberId: text("investor_member_id").notNull().references(() => members.id),
  amountMicro: integer("amount_micro").notNull(),
  repaidMicro: integer("repaid_micro").notNull().default(0),
  refundedAt: integer("refunded_at"), // set when the project missed its funding deadline
});

// Small key-value store for the simulator clock and similar state.
export const simState = sqliteTable("sim_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// AI trading agents (per workspace). Off until the member switches them on.
export const agentSettings = sqliteTable("agent_settings", {
  memberId: text("member_id").primaryKey().references(() => members.id),
  smartBattery: integer("smart_battery", { mode: "boolean" }).notNull().default(false), // hold surplus for better prices
  smartEv: integer("smart_ev", { mode: "boolean" }).notNull().default(false), // charge the car in the cheapest hours
  evReadyByHour: integer("ev_ready_by_hour").notNull().default(7), // car charged by this local hour
  updatedAt: integer("updated_at").notNull(),
});

// What the agents decided and why: the numbers behind each decision, shown on the agent page.
export const agentDecisions = sqliteTable(
  "agent_decisions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: text("member_id").notNull().references(() => members.id),
    ts: integer("ts").notNull(),
    kind: text("kind", { enum: ["battery_hold", "battery_sell_now", "battery_keep", "battery_discharge", "ev_plan", "rules"] }).notNull(),
    params: text("params", { mode: "json" }).$type<Record<string, number | string>>().notNull(),
  },
  (t) => [index("agent_decisions_member_ts").on(t.memberId, t.ts)],
);

// A smart-charging plan per car session: kWh per 15-minute slot, fixed once made.
export const evPlans = sqliteTable(
  "ev_plans",
  {
    siteId: text("site_id").notNull().references(() => sites.id),
    sessionKey: text("session_key").notNull(), // local date the car arrived
    slots: text("slots", { mode: "json" }).$type<Record<string, number>>().notNull(), // ts -> kWh
    createdAt: integer("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.sessionKey] })],
);

// Federation: other energy communities this one can exchange its leftover surplus or demand with.
// relation is the grid distance, which decides whether exchanging is energy sharing at all (§42c).
export const federationPeers = sqliteTable("federation_peers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  operator: text("operator").notNull(), // the Stadtwerk or cooperative running it
  relation: text("relation", { enum: ["same_substation", "same_area", "adjacent_area", "remote"] }).notNull(),
  distanceKm: real("distance_km").notNull(),
  // "trade": paid every hour; "credit": borrowed energy is repaid in kind later.
  mode: text("mode", { enum: ["trade", "credit"] }).notNull().default("trade"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// Energy exchanged with another community in one interval, from this community's point of view.
export const federationFlows = sqliteTable(
  "federation_flows",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ts: integer("ts").notNull(),
    peerId: text("peer_id").notNull().references(() => federationPeers.id),
    direction: text("direction", { enum: ["import", "export"] }).notNull(),
    // trade: paid at the federation price; credit: borrowed or lent, repaid in kind; repay: a credit
    // being repaid in kind; credit_settled: a credit not repaid within 30 days, paid in money instead.
    kind: text("kind", { enum: ["trade", "credit", "repay", "credit_settled"] }).notNull(),
    kwh: real("kwh").notNull(),
    priceCt: real("price_ct").notNull(), // 0 for credit and repay
    remainingKwh: real("remaining_kwh").notNull().default(0), // credit only: not repaid yet
    batchId: text("batch_id"),
  },
  (t) => [index("federation_flows_ts").on(t.ts), index("federation_flows_peer").on(t.peerId)],
);
