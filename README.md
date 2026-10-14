# Volty

**Live demo:** https://volty-demo.fly.dev (one-click demo accounts, no password)  
**Live product:** https://volty-prod.fly.dev (email and password: `mia.hoffmann@example.com` / `volty-demo`, or `admin` / `admin` for the Stadtwerk console)  
**Pitch video:** https://www.youtube.com/watch?v=CZ3PgSd27oo  
**Demo video:** https://www.youtube.com/watch?v=81t2OKlB6Mk

Neighbourhood energy sharing with 15-minute settlement on Solana. Households and small businesses in one grid area share rooftop solar under §42c EnWG. Every hour, buyers pay their neighbours and their roof's investors directly in euro stablecoins, from wallets they control, within a spending limit they set and can revoke. Roofs funded through **Solar Now, Pay Never** repay their investors through an on-chain program, and every hour's trades are published with a hash on Solana that anyone can check. Where the law requires the supplier to settle (Germany's default under §42c), the Stadtwerk pays sellers instead, on the same rails.

## Why Solana

The market itself stays off-chain: meter data is personal data, and matching runs under the grid operator's regulated processes. Solana is the money layer, for three things a bank can't do:

1. **Payments between neighbours every hour.** Thousands of payments of a few cents between households, each from the buyer's own wallet, within a limit only the buyer can change (an SPL token delegate approval, signed in their Privy wallet). SEPA has no spending limits like this, and its fees would eat the amounts.
2. **Investors repaid by code.** Every payment to a funded roof goes through the `roof-split` program (`programs/roof-split`). It splits the payment by the roof's terms stored on-chain: fee, reserve, investors pro rata until repaid, then the host. Investors don't have to trust Volty to send them the right share.
3. **A public record anyone can check.** Each hour's trades are published under pseudonymous site codes (`/verify`). Their SHA-256 is in the memo of that hour's Solana transactions, so nobody, Volty included, can change the record afterwards without it showing.

This repository is the WHU Hackathon 2026 MVP. It runs on **Solana devnet** with a test token (tEURC) and simulated smart meters.

## The frontend

The interface was redesigned for the product: a white, quiet look (Geist for text, Instrument Serif for accents, Volty orange for energy), one design for the public site and the app. The shared building blocks are CSS classes in `app/globals.css` (`.v-card`, `.v-btn`, `.v-pill`, `.v-input`, `.v-range` and others), and the charts use one validated colour palette (`lib/viz.ts`).

The app has two parts, as Next.js route groups:

- **Public site** (`app/(site)`): the landing page, login, sign-up, the live demo and the public record (`/verify`), with a top bar and a black footer (`components/shell/SiteHeader.tsx`).
  - **Landing page** (`app/(site)/page.tsx`): the hero with the two promises (*settled on Solana, paid in euros* and *AI agents do the work*) and a preview of the app, then the four AI agents with a "sunny day" timeline, the Solana section with the busiest settled hour as a live receipt, the price gap, an animated 3D street (`components/landing/StreetMap3D.tsx`), how it works, who it's for, the proof receipt, the Stadtwerk pilot form and links to §42c EnWG and EU Directive 2024/1711.
- **App** (`app/(app)`): every logged-in page, with a sidebar (`components/shell/Sidebar.tsx`) holding the workspace switcher, the pages for this workspace's role, the **Product | Demo** switch, DE | EN and logout. Logging in opens `/start`, which sends each workspace to its home: selling for a household with solar, buying for one without, the business page, the Stadtwerk console or the roofs for investors.

What the main app pages show:

- **AI agent** (`/agent`): what the four agents (forecast, matching, sun, payment) looked at, decided and achieved today; a **solar predictor** with the forecast sun through the day, its likely range and a clear-sky line, against what the panels measured (today and tomorrow); the agents' **timeline** of the day; the **price forecast** for the next 24 hours; **why this supplier** (the matching agent's ranking and backup); what the battery and car agents **earned this month**; and whether the forecast **is learning** (its error day by day against the standard model). Data: `lib/dashboard/agentDay.ts` and `lib/dashboard/agentInsights.ts`.
- **Buying** (`/buyer`): where each hour's power came from as stacked bars (with a size slider), payments, the next 24 hours in a table with backups, the 3D map with only the homes you traded with, and the buying rules as sliders and neighbour pills (`components/buyer/BuyingRules.tsx`).
- **Business** (`/sme`): the anchor agreement at a glance (window, daily cap, price, who supplies it, the monthly saving), the SME check, and a "your own roof could pay for itself" link to Solar Now, Pay Never.
- **Live map** (`/map`): the real 3D map with small house graphics and glowing arcs, moving dots for the energy (`components/map3d`).

## Product and demo copies

The same code runs as two copies, chosen by `VOLTY_MODE` (`lib/mode.ts`), each with its own database:

| | Demo (`VOLTY_MODE=demo`) | Product (`VOLTY_MODE=prod`) |
| --- | --- | --- |
| Live | https://volty-demo.fly.dev | https://volty-prod.fly.dev |
| Database | `data/kiezwatt.db` (the demo neighbourhood) | `data/prod.db` (`npm run prod:init`) |
| Logins | one-click demo accounts | email and password (scrypt hashes, `lib/auth/password.ts`), or Privy when configured |
| Sites | checked against the stand-in grid operator (Koblenz is rejected) | any valid meter, at the address typed (`lib/grid/openOperator.ts`), until a real operator connection exists |
| Live demo | yes | no |

Run both locally side by side: `npm run dev:demo` (port 3001) and `npm run dev:prod` (port 3002). The **Product | Demo** switch opens the same page in the other copy (`PROD_URL`, `DEMO_URL`).

**Deploying (Fly.io):** `fly deploy` deploys the demo (`fly.toml`), `fly deploy -c fly.prod.toml` the product. Each has its own volume and `SESSION_SECRET`. Data goes up as a bundle unpacked on start: `sh scripts/pack-data.sh` (demo) or `DB=prod sh scripts/pack-data.sh ../volty-prod-data.tgz` (product), uploaded to `/data/restore.tgz`. The live product is filled with made-up members and a simulated week by `scripts/seed-prod-fake.ts`, which only runs on a fresh database.

## Using the app

A walk through what you can do, in the order a new user would. Every step works on the live copies; nothing needs installing.

### Try the demo (5 minutes)

1. Open https://volty-demo.fly.dev and press **▶ Run the live demo** on the home page. The neighbourhood is simulated hour by hour up to the next sunny afternoon, and every hour is settled on Solana devnet. `/demo` shows each hour's price, payments and transactions as they happen, plus a seven-step guided tour.
2. **Log in** and pick a person under **Demo accounts** (one click, no password):
   - **Anna Schmitt** (solar and battery): **Selling** shows her roof, battery and earnings; **AI agent** shows what the four agents did, the solar predictor, the day's battery decisions and whether the forecast is learning.
   - **Ben** (no panels, electric car): **Buying** shows where each hour's power came from, the next 24 hours with backups and the map of who supplied him; **AI agent** shows his car's charging plan.
   - **Bäckerei Müller** (business): **Business** shows the anchor agreement and the SME check.
   - **Lena** (investor): **Solar Now, Pay Never** shows the Weber roof repaying its investors on-chain.
   - **Stadtwerk Vallendar**: **Stadtwerk console** shows members, every hourly settlement with its Solana transaction, and the market switches.
3. Open **Proof** (`/verify`, no login) and check any hour's hash against Solana yourself.

### Use the product as a new member

1. Open https://volty-prod.fly.dev, press **Get started** and sign up with an email and a password (8 characters or more).
2. **Create a workspace:** a **Household** or a **Business**. One login can own several and switch in the sidebar.
3. **Register your home** (**Your home**): street, postcode, the meter's market location ID (11 digits from the electricity bill, for example `50178002206`), and what's there: solar kWp, battery kWh, EV charger kW and yearly use. The home is approved straight away and joins matching from the next quarter-hour.
4. **Set your rules:**
   - Buyers set a maximum price and distance, and neighbours to prefer or never buy from (**Buying → Buying rules**).
   - Sellers set a minimum price and a battery reserve for the evening (**Selling → Selling rules**).
5. **Switch on the agents** (**AI agent**): smart battery and smart car charging (with a "ready by" time). You can also tell the agent what you want in your own words; that needs the language model running on the server (see [AI trading agents](#ai-trading-agents)).
6. **Payments:** when the Stadtwerk has peer-to-peer payments on, approve a monthly spending limit on **Buying** (the payment agent suggests one from your last 14 days). Volty never takes more, and you can revoke it at any time. Otherwise the Stadtwerk pays sellers and bills buyers monthly.
7. **Businesses** fill in the SME check (**Business**) and can set up an anchor agreement for their opening hours.
8. **Statements** shows each month's energy, VAT and Solana payouts, with a PDF download.

To see the product with data, log in as `mia.hoffmann@example.com` / `volty-demo` (household with solar and battery) or `cafe.morgenrot@example.com` / `volty-demo` (business).

### Run it as the Stadtwerk

Log in as `admin` / `admin` on the product copy (or as Stadtwerk Vallendar in the demo) and open **Stadtwerk console**:

- **Market and payments:** choose a fixed community price or the 15-minute auction, and whether the Stadtwerk pays sellers or neighbours pay each other.
- **Members and sites:** every member, wallet and site registration, with the reason for any rejection.
- **Settlements:** every hour's batch with its hash and Solana transactions, the treasury balance and a CSV export.
- **Neighbouring communities:** switch on sharing with nearby communities and choose paid trades or energy credits.

Note: meter readings are simulated in both copies. In the live product nothing simulates new homes in the background yet, so a home you register shows data once the simulator runs (`DATABASE_PATH=data/prod.db npm run sim -- --hours 24` locally).

## Quick start

Needs Node 24.

```bash
npm install
npm run db:push          # create the SQLite database in data/
npm run setup:devnet     # create demo wallets, the tEURC token and token accounts
npm run seed             # load the demo neighbourhood (links devnet wallets if present)
npm run sim -- --hours 24 --date 2026-10-01 --settle
npm run dev:demo         # http://localhost:3001 (the product copy: npm run dev:prod, port 3002)
```

`setup:devnet` tries a devnet airdrop for the Stadtwerk treasury. The airdrop is often rate-limited: if it fails, paste the printed treasury address into [faucet.solana.com](https://faucet.solana.com), then run the script again.

Without devnet, leave out `--settle`: the simulation still matches, posts the ledger and records each settlement as `simulated`.

## Pages

| Page | What it shows | Good demo URL |
| --- | --- | --- |
| `/seller` | Generation, battery and end-of-day forecast, buyers supplied, hourly payouts on Solana, the Solar Now, Pay Never split, map, selling rules | `/seller?as=weber&at=16:00` |
| `/buyer` | Where each 15 minutes came from, suppliers and payments, next 24 hours with backups, supply shifts, ranked potential suppliers, buying rules | `/buyer?as=baeckerei&at=16:00` |
| `/sme` | SME eligibility check, anchor agreement, usage against the neighbourhood's solar surplus, daily history | `/sme?as=baeckerei&at=16:00` |
| `/projects` | Solar Now, Pay Never: repayment progress, payoff estimate, investors, repayments on Solana; start, fund and install a new roof | `/projects` |
| `/agent` | The workspace's AI trading agent: what it may do, plain-language and spoken wishes turned into checked settings, its decisions with the numbers, explained and read out | `/agent` (as Anna or Ben) |
| `/federation` | The federation with neighbouring communities: who may share by grid distance, the recommended partner for the next 24 hours, credits and settlements | `/federation` (as the Stadtwerk) |
| `/verify` | Public record: every settled hour's trades and its hash on Solana, checked live (no login) | `/verify` |
| `/admin` | Stadtwerk view: community price, members and wallets, settlement batches with hashes and transactions, treasury balance, CSV export | `/admin` |

`/seller`, `/buyer`, `/sme`, `/agent` and `/admin` need a login (see below). Members always see their own data; `?as=` only works for Stadtwerk staff, who can open any member's view. `?at=HH:MM` replays the latest simulated day as it looked at that time. `/api/export/allocations?date=YYYY-MM-DD` returns one day's final allocations as CSV (staff only).

**Funding a new roof:** on `/projects`, start a project for a household, invest until it is funded, then mark it installed. The panels go live, and the next `npm run sim -- --hours 19 --settle` repays its investors on Solana.

## Accounts, workspaces and logging in

- **Sign up and log in** at `/signup` and `/login`. The product copy has email and password logins (stored as scrypt hashes; five wrong tries pause an email for 15 minutes). With [Privy](https://privy.io) configured, people can also use an email one-time code or a passkey, with no password and no seed phrase. The server checks Privy's signature on the identity token, then sets its own session cookie (`kw_session`, HttpOnly, 7 days).
- **Workspaces:** after signing up you create a **Household** or **Business** workspace. One login can own both (up to 5) and switch from the workspace menu in the sidebar. Each workspace is its own member, with its own Solana wallet, ledger, balances and bills: the first uses the wallet Privy creates at signup, and each further workspace gets an additional embedded wallet. The server only accepts a wallet that appears in Privy's signed token and isn't used by another workspace.
- **Permissions:** pages and actions always use the open workspace. Members only see and change their own data; `?as=` and `/admin` are for Stadtwerk staff.
- **Deleting an account** (`/account`) needs a fresh check first: Privy logins log in again (the token must be under 5 minutes old), and demo accounts enter a 6-digit code. Then you type DELETE. It's refused while energy is unsettled, a roof you host or an investment is still open, or it's the last Stadtwerk staff login. Deleting removes the login (and the Privy user), closes every workspace and removes names, rules and business details. Settled payments, readings and allocations stay anonymously, as billing records.

Add to `.env.local` (see `.env.example`):

- `SESSION_SECRET`: `openssl rand -base64 32`
- `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_VERIFICATION_KEY` and `PRIVY_APP_SECRET` from the Privy dashboard. In the dashboard, turn on email and passkey login, Solana embedded wallets, and "Return user data in an identity token".
- `DEMO_LOGIN=true` adds one-click demo accounts on `/login` and a demo signup without Privy, for local demos. Demo workspaces get a server-held devnet wallet, and the "email" with the deletion code is printed in the terminal running `npm run dev`. Never set it in production.

Each demo persona is a login (`<id>@kiezwatt.example`) owning one workspace; `stadtwerk@kiezwatt.example` is Stadtwerk staff. To log in as a persona with a real magic link, put your own email on its row in the `accounts` table. A database seeded before accounts existed needs `npm run db:push && npm run auth:demo-logins` (this keeps your data).

## Registering a site

A household or business workspace registers its site at `/site` (also in the workspace menu as "My site"): address, the meter's market location ID (MaLo-ID, 11 digits from the electricity bill) and what's there: solar kWp, battery kWh, EV charger kW and yearly use.

1. The form checks the MaLo-ID's format and check digit, and that the meter isn't already registered to another open site.
2. The grid operator is asked about the meter (`lib/grid/operator.ts` is the interface). It reports the grid area and location; the member never types the grid area.
3. The site is approved only if the operator knows the meter, the postcode matches its record, and the grid area is the community's (`DE-DEMO-VALLENDAR`). Otherwise it's rejected with the reason, and the attempt stays in the history and on `/admin`.
4. An approved site joins the simulation and matching from the next interval. EV chargers add a daily charging session (weekday evenings, weekend middays), and business sites use an opening-hours load profile.

The demo uses a stand-in grid operator (`lib/grid/demoOperator.ts`) that knows the demo homes plus four free meters in Vallendar and two in Koblenz (another grid area, so they're rejected). `/site` lists them. A real operator would answer through the supplier's market communication, within days, so registrations have a `pending` state. A database created before site registration needs care: to add the EV column, `db:push` wants to **empty the `sites` table** (say no). Add the column yourself first, then push and backfill:

```bash
sqlite3 data/kiezwatt.db "ALTER TABLE sites ADD COLUMN ev_charger_kw real DEFAULT 0 NOT NULL"
npm run db:push && npm run sites:backfill
```

## Live demo

With `DEMO_LOGIN=true` (or logged in as Stadtwerk staff), the home page has a **Run the live demo** button. One click:

1. switches on the 15-minute auction and peer-to-peer payments;
2. switches on the AI trading agents: Anna's smart battery, and smart charging for Ben's car (the demo gives his site an 11 kW wallbox if it has none);
3. prepares the demo wallets on devnet: tops up Ben and the bakery, lets the payment agent set their spending limits, and leaves Dana unapproved so the Stadtwerk has to cover her;
4. wakes the local language and voice models (skipped if Ollama isn't running; the agent page then explains with plain facts);
5. simulates from the simulation clock to 16:00 the next sunny day, settling every hour on Solana devnet (about 1–2 minutes).

`/demo` shows the progress live (each hour's market price, what was paid and its transactions) and a seven-step guided tour whose buttons log in as the right person. Each run continues from where the last stopped. Without devnet set up, payments are recorded but not sent.

For the language and voice parts, start Ollama first (`ollama serve`, then `ollama pull qwen2.5:7b` once). See [AI trading agents](#ai-trading-agents).

## Energy trading and peer-to-peer payments

Two switches on the Stadtwerk admin page ("Market and payments") change how the community trades and pays. Both apply from the next interval and the next hourly settlement.

**Price: fixed community price, or a 15-minute auction (1b).** In auction mode, anchor agreements are served first at their fixed price. Then trading agents turn each member's limits into price tranches: a seller offers half its surplus at its minimum price and the rest a little higher, a buyer bids half its demand at its maximum and the rest a little lower. One clearing price per interval is set where supply covers demand, between the 8 ct feed-in tariff and the 38 ct grid price: low on sunny middays, higher when power is scarce. The matching engine then decides who supplies whom at that price. Every clearing price is stored (`clearing_prices`) and shown on the seller and receiver pages; the code is `lib/match/auction.ts` and `clearMarket` in `lib/market.ts`.

**Payments: the Stadtwerk pays, or neighbours pay each other (1a, Austria's peer-to-peer model).** In peer-to-peer mode each buyer approves, once, a monthly spending limit in tEURC for Volty's settlement key (an SPL token delegate approval). Every hour the settlement key moves money straight from buyers' wallets to the parties of their purchases: sellers, and for a Solar Now, Pay Never roof the investors, reserve and fee. It can't take more than the approved limit, and buyers can revoke it on the receiver page. A buyer without enough limit or balance is covered by the Stadtwerk, so sellers are always paid. Each transfer is recorded in `settlement_transfers` as soon as it's confirmed, so a retried hour never pays twice. Statements show what a member paid from their wallet. The code is in `lib/solana/p2p.ts` and `settleP2p` in `lib/settlement/settle.ts`.

In the demo, wallets are server-held, so the receiver page has buttons to top up 25 tEURC (from the treasury, standing in for buying EURC), approve a limit and revoke it; the server signs as the member. With a real Privy wallet the member would sign the approval in the browser, which isn't built yet; until then the Stadtwerk covers those buyers.

## AI trading agents

`/agent` (**AI agent** in the sidebar) is each workspace's trading agent. It runs inside the 15-minute pipeline, before the meters are read (`agentControls` in `lib/agents/run.ts`). Members switch each part on themselves, and their own rules stay the limits.

**How it decides: forecasts, not rules of thumb.** The price forecast is the market itself, run a day ahead on every home's learned forecast (`planAhead` with `marginal: true`). For each quarter-hour it gives what one more kWh would sell for and what one more would cost, found by adding a small probe offer or bid to the auction (`clearMarket` in `lib/market.ts`). It runs twice: first as if nobody had an agent, then with the battery agents acting on those prices, so each agent also expects what the others will do. The forecast is refreshed every hour.

- **Battery agent** (sellers with a battery; `decideBattery` in `lib/agents/trading.ts`):
  - It keeps what the home needs until the sun is back. Using its own power saves the grid price, which always beats selling.
  - With surplus, it stores the rest too if the best evening price, after about 10% battery losses, beats today's price by more than a cent. Otherwise it sells now.
  - In the evening, it sells from the battery what is above the home's own need, when now is about the best price left (at most half the battery's capacity per hour).
- **EV agent** (buyers with a wallbox; `planCharging`): when the car arrives, it plans the car's need into the cheapest quarter-hours before it leaves. On weekdays that is "ready by" 07:00 (the member can change it); at weekends, eight hours. The plan is stored (`ev_plans`), so it doesn't change halfway.
- **Supplier choice** (`hourlyReliability` in `lib/forecast/supplier.ts`):
  - It learns, per seller and hour of day, how often that seller really had surplus over the last 14 days.
  - The receiver page weighs each seller's forecast by this ("Likely to deliver"), names the agent's pick, and chooses the cloud backup in the 24-hour plan by it.

Also learned, and also not a language model: each home's solar and use forecast learns from its own last 14 days of meter data (`lib/forecast/learned.ts`), and reports its error against the fixed solar model. The payment agent (`lib/agents/spending.ts`) suggests a spending limit from the buyer's own history.

Every decision is logged with its numbers (`agent_decisions`). Battery decisions are logged when they change. On a copy of the demo data, Friday 19:00 to Sunday 07:00:
- **Anna:** earned €2.01 instead of €1.69 (feed-in included).
- **Ben:** paid €9.27 instead of €9.59 (grid included). His car bought 2.7 kWh more from neighbours and 2.7 kWh less from the grid.

**The language layer (open-source, on this server, no API key).** It never makes trading decisions. It does two things:

- **Tell your agent:** typed or spoken wishes ("Never sell below 18 cents and let Ben have my solar first") become proposed setting changes.
  - The model's answer is constrained to a JSON schema with only the settings this member has.
  - Every value is checked and clamped in code (`lib/ai/rules.ts`), and names must be real members.
  - Nothing changes until the member presses Apply, which checks everything again.
- **Explain in plain words:** the logged decisions are rewritten as a short first-person explanation in the interface language, and **Listen** reads it out. Without a running model, the page shows the facts themselves.

| Part | Model | Licence | Runs with |
|---|---|---|---|
| Language | Qwen 2.5 7B Instruct (`qwen2.5:7b`) | Apache-2.0 | [Ollama](https://ollama.com), `lib/ai/ollama.ts` |
| Speech to text | Whisper base, multilingual, 8-bit | MIT | transformers.js (ONNX Runtime), `lib/voice/models.ts` |
| Voice, German | Piper `de_DE-thorsten-medium` | CC0 | ONNX Runtime + eSpeak NG (GPL-3.0, WebAssembly), `lib/voice/piper.ts` |
| Voice, English | Piper `en_US-libritts_r-medium`, speaker 20 | CC BY 4.0 | same |

Setup: install Ollama, run `ollama serve`, then `ollama pull qwen2.5:7b` (4.7 GB) once.
- The voice models download from Hugging Face into `data/models` the first time someone speaks or listens (about 220 MB), and stay in memory.
- `OLLAMA_URL` and `OLLAMA_MODEL` change the server and model. `qwen2.5:3b` answers about twice as fast, but it is under Qwen's research licence and got more wrong in tests (for example "ready by 6" became 10).
- On a 16 GB M2, a proposal takes 10–25 s with the 7B model, transcription about 1 s, and a spoken sentence 1–3 s.
- Small models write 1800 for "18 cents" when a setting is in cents, so the model is asked for euros and kilometres, and the code converts.
- The microphone records in the browser. Silence isn't sent, because Whisper invents words from silence.

## Federation of energy communities

`/federation` (**Neighbouring communities** in the sidebar). What a community's members can't share among themselves is matched with neighbouring energy communities: leftover surplus goes to a community that is short, and missing energy comes from one with surplus. The Stadtwerk switches it on and chooses, per community, paid trades or energy credits.

**Grid distance decides, not chains of contracts.** Power always flows through the one connected grid, so "A gets from B, B gets from C" nets out to C supplying A. A chain uses no less grid and can't stretch the legal limit. Instead, every neighbour has a place in the grid (`lib/federation/topology.ts`), and the model always prefers the nearest one that is allowed:

| Grid distance | §42c EnWG | In the demo |
|---|---|---|
| Same substation | allowed | Energiegemeinschaft Mallendar (energy credit) |
| Same grid area | allowed | Gewerbegebiet Vallendar-Nord, Solar-Genossenschaft Hillscheid |
| Directly adjacent grid area | from 1 June 2028 | Bürgerenergie Höhr-Grenzhausen (shown as "from 1 June 2028") |
| Further away (e.g. 43 km) | ordinary supply, not energy sharing | Quartier Cochem-Sehl (never matched) |

- **Matching** (`lib/federation/match.ts`, pure and tested). Each interval:
  1. Energy credits are repaid in kind first.
  2. New exchanges go to the nearest allowed community, then to the one that can help most.
  3. Paid trades use the federation price (23 ct, halfway between feed-in tariff and grid price).
  4. With a credit partner, energy is borrowed or lent up to 150 kWh and repaid in kind later, oldest first. Credits not repaid within 30 days are paid in money.
- **Advice** (`lib/federation/advice.ts`): the same matching run on the next 24 hours. Our side comes from the members' learned forecasts after local sharing; the neighbours' side comes from the same weather and their own mix. The page names the recommended community and the best exchange each hour.
- **Settlement:** every hour the money settles on Solana between the communities' treasuries, netted per community, in the same transactions' memo as the hour's public record. The exchanges are part of that record, so `/verify` covers them too.
- **On the map:** `/map` → **Region** shows every community at its real place, coloured by grid level, with the illustrative grid areas. Columns show what each had left in the hour (orange surplus, blue shortfall), and arcs show the energy exchanged with ours (paid, borrowed or repaid). Play the day; **All, incl. far away** zooms out to Cochem (43 km).
- **Live payments:** the seller and receiver pages show "Payments received, live" and "Payments made, live": one line per settled hour and neighbour, with its Solana link, sliding in as it happens. Every dashboard checks `/api/live` every 3 seconds and redraws only when an hour has been metered or settled (a red **Live** badge shows while the demo runs).
- **Live in the demo:** while the day is simulated, `/demo` shows **Live: energy between the communities**. It's a schematic with our community on the left and each neighbour on a ring by grid level, the faded ones not allowed. Every hour, bars show what each community has left, and animated arrows show the energy flowing (paid, borrowed or repaid, with kWh). Below it, the latest exchanges are listed with their Solana settlement. Without devnet each simulated hour takes about 1.6 s, so the day can be narrated; afterwards a slider replays it.
- **In the demo:** tour step 2, as the Stadtwerk, on `/federation`. Start with **Today with the neighbours** (one line per community, including why two were never used), then the grid levels, the 24-hour recommendation and the settlements, then **See it on the map**. The live demo's progress table has a column for each hour's kWh to and from neighbours.
- **Honest limits:** the neighbouring communities are simulated (same weather, their own mix of homes, businesses and solar), and their places in the grid are illustrative; a real federation gets them from the grid operator. The demo holds the neighbours' treasury keys. Savings and earnings stay with the community's Stadtwerk for now, not on members' bills.

## Rules that change who trades

- **SME check (FR-SME-01):** a business only shares energy while its SME check is valid: eligible, and confirmed within the last year. Until then (or after it lapses) its utility supplies it as usual. `/sme` shows the status and the date the check runs out.
- **Anchor agreements (FR-SME-03):** a business without one can create it on `/sme`; matching serves it first while the SME check is valid.
- **Battery evening reserve (FR-SEL-07):** in the selling rules, a seller sets how full the battery charges; surplus above that is sold to neighbours. No rule means "fill the battery first", as before. The simulator, the end-of-day forecast and the 24-hour plan all use it.
- **Public record (`/verify`, no login):** every settled hour, with its trades under pseudonymous site codes (`S-…`, each member sees their own on `/site`), the hash computed now, the hash stored at settlement, and the hash read back from the Solana memo. `/api/public/hour/<batch>` returns the exact bytes, so `curl … | shasum -a 256` checks it without trusting the page. The codes come from a secret in `data/public-code-secret` (or `PUBLIC_CODE_SECRET`). Hours settled before full hashes were published show as "can't be checked".
- **Roof-split program:** every payment to a funded roof, in both payment modes, is one `Pay` instruction of the program (a buyer's wallet as the payer, or the Stadtwerk's treasury when it covers a buyer or pays feed-in). Before paying, the hour's sales are split again from the roof's on-chain state in payment order. If that differs from the ledger (only in the hour a reserve or repayment cap is reached), the pending ledger entries are corrected, so the ledger matches the chain to the micro-euro. `/projects` shows each roof's on-chain state. See `programs/roof-split/README.md`.
- **Own wallets:** a member with a Privy wallet approves and revokes the spending limit on the receiver page, signing in the browser. The server prepares the transaction, checks that the signed one is byte for byte what it prepared, and only then adds the settlement key's signature as fee payer and sends it. It never co-signs anything else (`lib/solana/walletApproval.ts`). Demo personas keep server-held wallets.
- **Feed-in for funded roofs (Solar Now, Pay Never):** a funded roof's power that no neighbour buys goes into the grid and earns the feed-in tariff (8 ct). The Stadtwerk pays it each interval, standing in for the grid operator it claims it from, and it is split like any sale: fee, reserve, investors, host. Statements show it as its own "fed into the grid" line. With the wider neighbourhood and a 15% return, the Weber roof pays off in about 11 years instead of about 16.
- **Funding deadline (Solar Now, Pay Never):** a new project's funding round runs 7–90 days (30 by default). If the target isn't met in time, the round is called off and every investment is marked refunded; no further investments are accepted.
- **Exact location (FR-SEL-06):** neighbours' maps show a home at street level unless its member opts in on `/site`.

## 3D map

`/map` shows the neighbourhood in 3D for one simulated day: tilt and rotate with right-drag (or Ctrl+drag), and step through the hours with the slider or "Play the day". Columns show each home's solar (orange) and use (blue) in that hour, arcs show who supplied whom, and the real power grid (380 kV and 110 kV lines, local lines, substations, transformers) comes from OpenStreetMap. Homes are shown at street level unless their member opted in (Stadtwerk staff see exact locations).

The seller and receiver dashboards use the same map in a compact form: the dashboard's day so far as totals (or hour by hour), only that home's arcs, framed on the home and everyone it traded with.

It uses MapLibre GL 5 with free OpenFreeMap tiles (no API key) and deck.gl for the columns and arcs. MapLibre stays on version 5 because deck.gl 9.4 doesn't support MapLibre 6's renderer yet. `npm run grid:fetch` refreshes `public/geo/grid.geojson` from OpenStreetMap; street-level low-voltage cables aren't in OpenStreetMap, so the grid operator's data would add them. The grid-area outline is illustrative.

## Monthly statements

`/statements` (in the sidebar) shows one statement per workspace and month, with a PDF download (`/statements/pdf?month=YYYY-MM`, optional `&lang=de|en`):

- energy bought from and sold to neighbours, per price, with kWh and amounts;
- VAT: amounts are gross, and the statement shows the 19% VAT they include. Households' sales carry no VAT (small-business rule, §19 UStG); businesses' sales do;
- for a Solar Now, Pay Never roof: the Volty fee (with its VAT), the reserve and the investor repayments taken from the sales, and what reached the host. Investors see their repayments per roof (no VAT, §4 No. 8 UStG);
- the summary: paid out on Solana, charged with the electricity bill, and not yet settled. Settlement nets each hour per workspace, so these always add up to credits minus charges;
- every payout with a link to its Solana transaction, and the month's meter totals.

The numbers come from the ledger (`lib/statements/compute.ts`, pure and unit-tested); the PDF is drawn with pdfkit (`lib/statements/pdf.ts`). It's a demo statement, not a tax invoice.

## Languages

The interface is in German and English. The first visit follows the browser's languages; the DE | EN switch (top bar of the public pages, bottom of the sidebar) saves the choice in a cookie (`kw_lang`). All text lives in `lib/i18n/messages/en.ts` and `de.ts`. TypeScript checks that both have the same keys, so a missing German string is a type error. Numbers, money and dates follow the language (`1.234,50 €` and `Do., 1. Okt.` in German), always in the community's time zone. The data layer returns codes (statuses, rejection reasons, deletion blockers), so stored reasons also show in either language.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run db:push` | Create or update tables from `db/schema.ts` |
| `npm run setup:devnet` | Wallets in `data/keys/`, tEURC mint, token accounts, 100,000 tEURC for the treasury; writes `data/devnet.json` |
| `npm run seed` | **Wipes the database** and loads the demo neighbourhood; simulate again afterwards |
| `npm run auth:demo-logins` | Creates a login account for each demo persona without wiping data |
| `npm run sites:backfill` | Adds address, meter ID and grid area to demo sites without wiping data |
| `npm run grid:fetch` | Downloads the power grid around the community from OpenStreetMap for the 3D map |
| `npm run sim -- --hours N [--date YYYY-MM-DD] [--settle] [--delay ms]` | Advance the neighbourhood in 15-minute steps; settle every hour |
| `npm test` | Unit tests for matching, the ledger, the SME check, login rules, site registration, statements and languages |
| `npm run typecheck` | Generate Next.js route types and run the TypeScript compiler |

## The demo neighbourhood

| Member | Role |
| --- | --- |
| Stadtwerk Vallendar (demo) | Supplier and service provider; its treasury pays sellers |
| Anna, Carla | Households with solar (Anna also has a 10 kWh battery) |
| Familie Weber | 30 kWp barn roof funded by Solar Now, Pay Never |
| Ben, Dana, Emil | Households without solar (Emil's 10 kWp roof can be funded on `/projects`) |
| Fatma, Georg, Hanna, Jonas | More households without solar |
| Bäckerei Müller | SME anchor buyer: weekdays 10:00–16:00, up to 60 kWh a day at 17 ct |
| Frischemarkt Vallendar, Praxis Dr. Klein, Schreinerei Lang | Small businesses with daytime use, so the big roofs sell most of their output locally |
| Lena, Tom | Investors in the Weber roof (€20,000 and €15,000, repaid with a 15% return) |

`npm run neighbours:add` adds personas missing from an existing database (members, logins, sites, rules, SME check data) without a reseed. Run `npm run setup:devnet` first so they get devnet wallets.

A scripted cloud passes between 14:00 and 15:30, so the dashboards and switching have something to react to.

## How it works

1. **Simulate** (`lib/sim`): solar output from the sun's position and cloud cover, household and bakery load profiles, and a battery that serves its home first.
2. **Match** (`lib/match`): the anchor agreement is served first, then the rest goes to the nearest allowed pairs at the community price (20 ct/kWh).
3. **Ledger** (`lib/ledger`): every allocation is a balanced double-entry transaction in integer micro-euros. A sale from a funded roof is split by the waterfall: 3% platform fee, 5% reserve until full, 85% to investors until repaid, the rest to the host.
4. **Settle** (`lib/settlement`): each hour, positive balances are netted and paid from the treasury in one or a few Solana transactions. Each carries a memo with the batch id and a hash of the hour's allocations, so any member can check the payment against the allocation. Buyers' balances go on the supplier's normal monthly bill.

## Project layout

```
app/(site)/       public pages: landing, login, sign-up, live demo, public record
app/(app)/        logged-in pages: seller, buyer, sme, agent, projects, map, admin…
components/shell/ sidebar, site header and footer, Product | Demo switch
components/       shared UI
db/               Drizzle schema and SQLite client
lib/sim/          meter simulator, battery model, clock
lib/match/        allocation engine
lib/ledger/       double-entry ledger and the Solar Now, Pay Never waterfall
lib/settlement/   hourly netting and payout batches
lib/solana/       devnet wallets and payout transactions
lib/forecast/     battery forecast, 24-hour supply plan, supplier availability
lib/dashboard/    data for each page
lib/market.ts     rules that turn meter values into supplies and demands
scripts/          setup-devnet, seed, run-sim, init-prod, seed-prod-fake
tests/            unit tests
```

## Demo caveats

- Devnet only. Demo personas use server-held keypairs in `data/keys/` (git-ignored) until they log in through Privy, which links their non-custodial embedded wallet as the payout address. The Stadtwerk treasury key stays on the server.
- Meter data is simulated. In production, validated 15-minute data arrives from the metering operator the next day, and each interval settles then.
- tEURC is a test token standing in for Circle's EURC.
