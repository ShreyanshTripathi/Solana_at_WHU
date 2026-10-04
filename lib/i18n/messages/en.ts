// Every interface string, in English. de.ts must have exactly the same shape: TypeScript checks it.
// Values are strings, or functions for text with numbers or names in it (already formatted by the caller).

type S = string;

export const en = {
  meta: {
    description:
      "Neighbourhood energy sharing with 15-minute settlement on Solana",
  },
  common: {
    you: "You",
    none: "None",
    save: "Save",
    saveRules: "Save rules",
    view: "view",
    yes: "yes",
    no: "no",
    unknown: "Unknown",
    loading: "Loading…",
    open: "Open",
    rulesApplyFromNow: "Changes apply to intervals matched from now on.",
    asOf: (day: S, time: S) => `${day}, as of ${time}`,
    kind: {
      household: "Household",
      sme: "Business",
      investor: "Investor",
      supplier: "Stadtwerk",
      platform: "Platform fees",
    } as Record<S, S>,
    batchStatus: {
      open: "Being prepared",
      submitted: "Sent, awaiting confirmation",
      confirmed: "Paid on Solana",
      simulated: "Simulated (no transfer)",
      failed: "Failed, will retry",
      pending: "Not yet paid",
    } as Record<S, S>,
    batchStatusShort: {
      open: "Preparing",
      submitted: "Sent",
      confirmed: "Paid",
      simulated: "Simulated",
      failed: "Failed",
      pending: "Pending",
    } as Record<S, S>,
    language: "Language",
    autoRefresh: "Updates automatically",
    live: "Live",
  },
  nav: {
    seller: "Seller",
    receiver: "Receiver",
    sme: "SME",
    projects: "Solar Now, Pay Never",
    statements: "Statements",
    map3d: "3D map",
    agent: "AI agent",
    federation: "Federation",
    admin: "Stadtwerk admin",
    logIn: "Log in",
    signUp: "Sign up",
    logOut: "Log out",
    noWorkspace: "No workspace",
    mySite: "My site",
    newWorkspace: "+ New workspace",
    accountSettings: "Account settings",
  },
  home: {
    eyebrow: "Energy sharing under §42c EnWG · live demo on Solana devnet",
    tagline:
      "Neighbours pay each other for rooftop solar every hour, straight from their own wallets.",
    pitch: (feedIn: S, grid: S, community: S) =>
      `A solar owner gets about ${feedIn} ct/kWh from the grid; the neighbour pays about ${grid} ct. Volty lets them trade in between (${community} ct, or a 15-minute market price). Every hour, buyers pay their neighbours and the roof's investors directly in euro stablecoins on Solana, within a limit each buyer sets and can revoke. A Solana program splits each payment to a funded roof, and every hour's trades are published with a hash on-chain that anyone can check.`,
    ctaVerify: "Check the public record",
    ctaSeller: "See a seller's dashboard",
    ctaStadtwerk: "See the Stadtwerk view",
    deleted: "Your account has been deleted and you've been logged out.",
    noData: "No data yet. Run npm run db:push, npm run seed and npm run sim.",
    community: (
      name: S,
      households: number,
      businesses: number,
      investors: number,
    ) =>
      `${name} · ${households} households, ${businesses} ${businesses === 1 ? "business" : "businesses"}, ${investors} investors`,
    simulatedUpTo: (day: S, time: S) => ` · simulated up to ${day}, ${time}`,
    tiles: {
      shared: "Shared between neighbours",
      sharedSub: (days: number) => `Across ${days} simulated days`,
      paid: "Paid out on Solana",
      paidSub: (n: number) => `${n} confirmed hourly payouts`,
      homes: "Homes with solar",
      homesValue: (a: number, b: number) => `${a} of ${b}`,
      homesSub: "The rest buy from them",
      co2: "CO₂ avoided",
      co2Sub: "Against the German grid average",
    },
    dayTitle: (day: S, share: S) =>
      `On ${day}, neighbours used ${share} of the neighbourhood's solar`,
    dayNote: (generated: S, shared: S) =>
      `kWh per hour: ${generated} generated, ${shared} used next door. The rest charged batteries, ran the sellers' own homes or went to the grid.`,
    howItWorks: "How it works",
    steps: [
      {
        title: "Measure",
        text: "Smart meters report every quarter-hour of solar and usage.",
      },
      {
        title: "Match",
        text: "Local businesses first, then the nearest neighbours, at one community price.",
      },
      {
        title: "Pay",
        text: "The Stadtwerk pays sellers every hour in EURC on Solana.",
      },
      {
        title: "Repay",
        text: "Roofs funded by investors split every sale and repay them automatically.",
      },
    ],
    explore: "Explore the demo",
    views: [
      {
        title: "Seller",
        who: "Familie Weber's 30 kWp barn roof",
        text: "Output, battery forecast, buyers and hourly payouts on Solana.",
      },
      {
        title: "Receiver",
        who: "Bäckerei Müller",
        text: "Where each 15 minutes of power came from, payments and the next 24 hours.",
      },
      {
        title: "Small business",
        who: "Bäckerei Müller",
        text: "SME eligibility, the anchor agreement for the midday surplus.",
      },
      {
        title: "Solar Now, Pay Never",
        who: "Investors and roof hosts",
        text: "Fund a roof and watch every sale repay the investors.",
      },
      {
        title: "Stadtwerk admin",
        who: "Stadtwerk Vallendar",
        text: "Community price, members, every payout batch and exports.",
      },
    ],
    latestPayouts: "Latest payouts on Solana",
    latestPayoutsNote:
      "One transaction per hour from the Stadtwerk's treasury. Each carries a hash of that hour's allocations.",
    noPayouts: "No payouts yet. Run the simulator with --settle.",
    table: {
      hour: "Hour",
      recipients: "Recipients",
      paid: "Paid",
      transaction: "Transaction",
    },
    footer:
      "Demo for the WHU Hackathon 2026. Meter data is simulated; payouts use a test euro token on Solana devnet.",
  },
  seller: {
    title: "Seller dashboard",
    empty: {
      before: "No solar readings for this workspace yet.",
      link: "Register your site",
      after:
        "with its panels, and output and payouts show here after the next simulated intervals.",
    },
    choose: "Choose a seller",
    batteryKwh: (kwh: S) => ` · ${kwh} battery`,
    tiles: {
      generatingNow: "Generating now",
      today: (kwh: S) => `${kwh} today`,
      batteryNow: "Battery now",
      batteryOf: (pct: S, cap: S) => `${pct} of ${cap}`,
      battery: "Battery",
      noBatterySub: "Surplus goes straight to neighbours",
      batteryEnd: "Battery at end of day",
      batteryForecast: "Battery at 23:45 (forecast)",
      measured: "Measured",
      likely: (lo: S, hi: S) => `Likely ${lo}–${hi} kWh`,
      sold: "Sold to neighbours today",
      soldSub: (kwh: S, extra: S, feedIn: S) =>
        `${kwh} · ${extra} more than the ${feedIn} ct feed-in tariff`,
      paid: "Paid out to you",
      paidSub: "On Solana, every hour",
      toPay: "Still to be paid",
      nextPayout: (time: S) => `Next payout at ${time}`,
    },
    generationTitle: (kwh: S, kw: S, time: S) =>
      `${kwh} generated today, peaking at ${kw} kW at ${time}`,
    generationNote: "Solar generation per 15 minutes, kWh",
    batteryEnded: (kwh: S) => `Battery ended the day at ${kwh}`,
    batteryExpected: (kwh: S, lo: S, hi: S) =>
      `Battery expected to end the day at ${kwh} (likely ${lo}–${hi} kWh)`,
    batteryNote:
      "Energy in the battery, kWh. Solid: measured. Dashed: forecast. Shaded: likely range.",
    reasonUp: (solar: S, use: S, hours: S) =>
      `Why: about ${solar} of solar is still expected in the ${hours} hours of daylight left, more than the ${use} you usually use until midnight.`,
    reasonDown: (solar: S, use: S, hours: S) =>
      `Why: only about ${solar} of solar is still expected in the ${hours} hours of daylight left, less than the ${use} you usually use until midnight.`,
    reasonCapped: (reserve: S) =>
      ` Your evening reserve stops it charging above ${reserve}.`,
    learnedNote: (days: number, learned: S, fixed: S) =>
      `Forecast learned from your last ${days} days of meter data. Yesterday it was off by ${learned}; the fixed solar model by ${fixed}.`,
    learningNote: (days: number) =>
      `Learning from your meter data (${days} of 3 days so far); until then it uses the fixed solar model.`,
    suppliedToday: "Who you supplied today",
    noSales: "No sales yet today.",
    table: {
      buyer: "Buyer",
      kwh: "kWh",
      price: "Price",
      amount: "Amount",
      status: "Status",
    },
    orderStatus: {
      settled: "Settled",
      partly: "Partly settled",
      delivered: "Delivered",
    } as Record<S, S>,
    alsoBought: (eur: S) =>
      `You also bought ${eur} from neighbours; that goes on your monthly statement.`,
    payouts: "Payouts on Solana",
    noPayouts: "No payouts yet today.",
    waterfallTitle: (eur: S) =>
      `Solar Now, Pay Never: how today's ${eur} was split`,
    waterfallNote: (project: S) =>
      `${project} · every sale repays the investors automatically`,
    waterfall: {
      fee: "Volty fee",
      reserve: "Maintenance reserve",
      investor: "Investors (repayment)",
      host: "You (roof host)",
    } as Record<S, S>,
    repaymentProgress: "Repayment progress",
    reached: (n: number) =>
      `Your power reached ${n} ${n === 1 ? "neighbour" : "neighbours"} today`,
    mapNote: (co2: S) =>
      `Arcs show who you supplied (wider = more kWh); columns show each home's solar and use. Right-drag to rotate. Other homes are shown at street level unless they opted in. About ${co2} kg of CO₂ avoided against the grid average.`,
    rules: "Selling rules",
    minPrice: (community: S) =>
      `Minimum price, ct/kWh (community price is ${community} ct)`,
    priority: "Supply these neighbours first",
    rulesIntro:
      "Your trading agent bids with these limits. You can also set them in plain words on the AI agent page.",
    minPriceLabel: "Lowest price you sell for",
    minPriceHint: (community: S, feedIn: S) =>
      `The community price is ${community} ct. Below ${feedIn} ct you'd earn more from the feed-in tariff.`,
    reserveLabel: "Keep in the battery for the evening",
    priorityHint:
      "They get your surplus before anyone else, at the same price.",
    paidOutToday: "Paid out today",
    hourCol: "Hour",
    reserve: "Battery reserve for the evening, kWh",
    reserveHint: (cap: S) =>
      `The battery charges to this level; surplus above it is sold to neighbours. ${cap} keeps today's behaviour (fill it first).`,
  },
  buyer: {
    title: "Receiver dashboard",
    empty: {
      before: "No meter readings for this workspace yet.",
      link: "Register your site",
      after:
        "and where your power came from shows here after the next simulated intervals.",
    },
    choose: "Choose a receiver",
    communityPrice: (ct: S) => `community price ${ct} ct/kWh`,
    tiles: {
      localShare: "Local share today",
      fromNeighbours: (kwh: S) => `${kwh} from neighbours`,
      fromUtility: "From your utility today",
      fromUtilitySub: "Covers whatever sharing doesn't",
      saved: (month: S) => `Saved in ${month}`,
      savedSub: (grid: S) => `vs the ${grid} ct grid price`,
      bill: (month: S) => `On your ${month} statement`,
      billSub: "For power from neighbours",
    },
    chartTitle: (share: S, top: S) =>
      `${share} of your power came from neighbours today, most of it from ${top}`,
    chartTitleNone: "No power from neighbours yet today",
    chartNote: "Where each 15 minutes of your power came from, kWh",
    suppliers: (month: S) => `Your suppliers in ${month}`,
    noneYet: "None yet.",
    table: {
      supplier: "Supplier",
      kwhToday: "kWh today",
      eurToday: "€ today",
      kwh: "kWh month",
      share: "Share",
      amount: "€ month",
    },
    shareNote: "Share = part of all the power you used this month.",
    payments: "Payments",
    paymentsNote:
      "The Stadtwerk pays your neighbours on Solana every hour and adds the amount to your monthly statement.",
    nothingToPay: "Nothing to pay yet.",
    paymentsNoteP2p:
      "Peer-to-peer: you pay your neighbours directly from your wallet every hour, within the limit you approved below.",
    paid: (eur: S) => `${eur} paid`,
    pending: (eur: S) => ` · ${eur} pending`,
    payment: (n: number) => `payment ${n}`,
    paidThisMonth: "Paid to neighbours this month",
    pendingShort: (eur: S) => `${eur} still to pay`,
    payCount: (n: number) => (n === 1 ? "1 payment" : `${n} payments`),
    next24: "Next 24 hours: planned supply and backups",
    next24Note:
      "Forecast from the solar model. If clouds cut your main supplier's output, supply moves to the backup automatically.",
    next24None: "No neighbour supply expected in the next 24 hours.",
    scheduleTable: {
      hour: "Hour",
      utility: "Utility",
      backup: "Backup if cloudy",
    },
    shifts: "How your supply shifted today",
    noShifts: "No supplier changes so far today.",
    shift: (kwh: S, from: S, to: S) => `${kwh} kWh moved from ${from} to ${to}`,
    shiftReason: {
      fell: (name: S) => `${name}'s surplus fell`,
      rebalanced: "rebalanced across suppliers",
    },
    potential: "Potential suppliers",
    rankBy: "Rank suppliers by",
    ranks: {
      score: "Best overall",
      reliability: "Most reliable",
      distance: "Nearest",
      price: "Cheapest",
    } as Record<S, S>,
    potentialTable: {
      seller: "Seller",
      price: "Price",
      distance: "Distance",
      available: "Available",
      steadiness: "Steadiness",
      next24: "Next 24 h",
      likely: "Likely to deliver",
      status: "Status",
    },
    agentPick: (name: string, kwh: string, distance: string) =>
      `Your agent's pick: ${name}. Likely to deliver ${kwh} in the next 24 hours, ${distance} away.`,
    agentPickNote:
      "Picked from what each seller is forecast to have, weighed by how often it really had surplus at those hours (learned from the last 14 days), its distance and your rules.",
    backupPct: (pct: string) => `${pct} reliable at this hour`,
    potentialStatus: {
      blocked: "Blocked by you",
      outside: "Outside your rules",
      preferred: "Preferred",
      available: "Available",
    },
    potentialNote:
      "Available: share of daylight quarter-hours with surplus to share, last 30 days. Steadiness: how evenly output flows (100% = no swings). Next 24 h: forecast surplus. Likely to deliver: that forecast weighed hour by hour by how often the seller really had surplus at that hour, last 14 days.",
    mapTitle: "Where your power came from today",
    mapNote:
      "Arcs show who supplied you (wider = more kWh); columns show each home's solar and use. Right-drag to rotate. Other homes are shown at street level unless they opted in.",
    rules: "Buying rules",
    maxPrice: "Maximum price, ct/kWh",
    maxDistance: "Maximum distance, m",
    prefer: "Prefer",
    never: "Never buy from",
    rulesNote:
      "Changes apply to intervals matched from now on. Your utility always covers the rest.",
  },
  sme: {
    title: "SME workspace",
    notBusiness:
      "This workspace isn't a business. Create a Business workspace from the workspace menu.",
    businessWorkspace: "business workspace",
    noMeter: {
      before: "No meter yet.",
      link: "Register your business's site",
      after:
        "to start buying local solar. You can already fill in the SME check below.",
    },
    tiles: {
      anchorToday: "Anchor supply today",
      capUsed: (pct: S, cap: S) => `${pct} of the ${cap} kWh daily cap`,
      noAnchor: "No anchor agreement",
      localShare: (month: S) => `Local share, ${month}`,
      fromNeighbours: (kwh: S) => `${kwh} from neighbours`,
      saved: (month: S) => `Saved in ${month}`,
      savedSub: (grid: S) => `vs the ${grid} ct grid price`,
      co2: "CO₂ avoided this month",
      co2Sub: "Against the grid average; for your reports",
    },
    profileTitle:
      "Your busiest hours line up with the neighbourhood's solar surplus",
    profileNote:
      "kWh per hour today. The anchor agreement buys the surplus in your window first.",
    eligibility: "Eligibility for energy sharing",
    eligibilityNote: (staff: S) =>
      `§42c EnWG allows households and SMEs only. EU SME definition: under ${staff} staff, and turnover up to €50M or a balance sheet up to €43M.`,
    eligible: "✓ Eligible as an SME",
    status: {
      eligible: (until: S) => `Sharing energy. SME check valid until ${until}.`,
      expired:
        "Not sharing energy: your SME check is over a year old. Confirm your figures again below.",
      unchecked:
        "Not sharing energy yet: complete the SME check below. Until then your utility supplies you as usual.",
      ineligible:
        "Not sharing energy: this business doesn't meet the SME definition. A partner utility can supply local green power instead.",
    },
    notEligible: "✗ Not eligible",
    reasons: {
      staff: (limit: S, entered: S) =>
        `Staff must be under ${limit} (you entered ${entered}).`,
      financials:
        "Either turnover must be at most €50M or the balance sheet at most €43M.",
    },
    staff: "Staff (full-time equivalent)",
    turnover: "Annual turnover, €",
    balanceSheet: "Balance sheet total, €",
    checkAndSave: "Check and save",
    checkNote:
      "Re-confirmed every year. Larger companies can buy local green power through a partner utility instead.",
    anchor: "Anchor agreement",
    anchorSummary: (days: S, from: S, to: S, cap: S, price: S) =>
      `${days} ${from}–${to}, up to ${cap} kWh a day at a fixed ${price} ct/kWh. Your supply is matched first in this window.`,
    weekdays: "Weekdays",
    everyDay: "Every day",
    from: "From",
    to: "To",
    dailyCap: "Daily cap, kWh",
    price: (lo: S, hi: S) => `Price, ct/kWh (${lo}–${hi})`,
    weekdaysOnly: "Weekdays only",
    saveAgreement: "Save agreement",
    noAnchorYet:
      "No anchor agreement yet. Set one up to buy the neighbourhood's midday surplus first, at a fixed price.",
    createAgreement: "Create agreement",
    anchorWhileEligible:
      "Matching serves the agreement while your SME check is valid.",
    history: (month: S) => `Daily supply in ${month}`,
    historyTable: {
      day: "Day",
      anchor: "Anchor kWh",
      capUsed: "Cap used",
      other: "Other neighbours kWh",
      total: "Total bought",
    },
    ownSolar: "Selling your own solar",
    ownSolarText:
      "An SME can also share power from its own roof. §42c requires that running the plant does not mainly serve the business, which is legally unclear, so Volty flags this for legal review and suggests running the plant through an energy cooperative.",
  },
  projects: {
    onChain: {
      title: "On Solana:",
      state: (repaid: S, owed: S, reserve: S, investors: number) =>
        `the roof-split program has paid investors ${repaid} of ${owed}, with ${reserve} in the reserve, split between ${investors} investors by the terms stored on-chain. Every payment to this roof goes through it.`,
      account: "roof account",
      notYet:
        "On Solana: this roof is registered with the roof-split program at its first on-chain payment.",
      unreachable: "Solana devnet can't be reached right now.",
    },
    title: "Solar Now, Pay Never",
    intro:
      "Investors fund a roof; a fixed share of every kWh it sells repays them automatically. The host pays nothing up front.",
    host: (name: S) => `Host: ${name}`,
    stage: "Project stage",
    states: {
      draft: "Draft",
      funding: "Funding",
      funded: "Funded",
      installed: "Installed",
      repaying: "Repaying",
      paid_off: "Paid off",
      refunded: "Refunded",
    } as Record<S, S>,
    raised: (raised: S, target: S, pct: S) =>
      `${raised} of ${target} raised (${pct})`,
    logInToInvest: "Log in to invest",
    investor: "Investor",
    amount: "Amount, €",
    invest: "Invest",
    markInstalled: "Mark installed and start repaying",
    markInstalledNote:
      "The panels go live; run the simulator to see its first sales repay investors.",
    fullyFunded: "Fully funded. The Stadtwerk confirms installation.",
    deadline: (date: S, days: number) =>
      `Funding closes on ${date} (${days} ${days === 1 ? "day" : "days"} left). If the target isn't met by then, every investor is refunded.`,
    refundedNote:
      "The funding target wasn't reached by the deadline, so the round was called off and every investor refunded.",
    refundedTag: "refunded",
    fundingDays: "Funding round, days",
    escrowNote:
      "In the demo, funds are recorded off-chain. In production they sit in an on-chain escrow run by a partner energy cooperative, and a missed funding deadline refunds every investor.",
    tiles: {
      repaid: "Repaid to investors",
      repaidSub: (owed: S, pct: S) => `of ${owed} owed (${pct})`,
      reserve: "Reserve",
      reserveSub: (target: S) => `target ${target}`,
      payoff: "Projected payoff",
      payoffValue: (years: S) => `~${years} years`,
      payoffNone: "Not enough data",
      payoffSub: (eur: S) => `${eur} a year to investors`,
      system: "System",
      systemSub: (eur: S) => `${eur} installed`,
    },
    payoffNote: (share: S, price: S, grid: S, feedIn: S) =>
      `Payoff estimate: a year of about 930 kWh per kWp, with ${share} sold to neighbours at an average ${price} ct and ${grid} fed into the grid at the ${feedIn} ct feed-in tariff, as this roof has done so far. Autumn data understates a full year.`,
    investors: "Investors",
    noInvestors: "No investors yet.",
    investorTable: {
      investor: "Investor",
      invested: "Invested",
      repaid: "Repaid",
      owed: "Owed in total",
    },
    latestRepayments: "Latest repayments on Solana",
    repaidLatest: (n: number) =>
      `Repaid in the last ${n} ${n === 1 ? "hour" : "hours"}`,
    noneYet: "None yet.",
    toInvestors: (eur: S) => `${eur} to investors`,
    waterfall: (fee: S, reserve: S, target: S, investors: S, owed: S, ret: S) =>
      `Waterfall on every sale: ${fee}% Volty fee · ${reserve}% to the reserve until it holds ${target} · ${investors}% to investors until ${owed} is repaid (principal plus ${ret}%) · the rest to the host.`,
    haveRoof: {
      before: "Have a roof without solar?",
      link: "Log in",
      after: "to have investors fund it.",
    },
    start: "Start a new project",
    roofHost: "Roof host",
    projectName: "Project name",
    defaultName: "Rooftop solar",
    size: "System size, kWp",
    cost: "Installed cost, €",
    startFunding: "Start funding",
  },
  admin: {
    exportCols: {
      day: "Day",
      exchanges: "Exchanges",
      kwh: "kWh shared",
      file: "File",
    },
    download: "CSV",
    anchorWindow: "Window",
    anchorMax: "Up to",
    anchorPrice: "Price",
    olderHours: (n: number) => `Show ${n} older hours`,
    batchKpis: {
      hours: "Hours shown",
      onChain: "Paid on Solana",
      simulated: "Simulated",
      failed: "Failed",
      paid: "Paid out",
    },
    verifyShort: "Verify",
    txCount: (n: number) => (n === 1 ? "1 tx" : `${n} tx`),
    title: "Stadtwerk admin",
    staffOnly: "Only Stadtwerk staff can open this page.",
    noCommunity: "No community yet. Run npm run seed first.",
    subtitle: (grid: S, n: number) =>
      `Stadtwerk admin · grid area ${grid} · ${n} members`,
    tiles: {
      shared: "Shared between neighbours",
      sharedSub: "All simulated days",
      paid: "Paid out on Solana",
      paidSub: (n: number) => `${n} confirmed batches on devnet`,
      fees: "Volty fees",
      feesSub: "From Solar Now, Pay Never sales",
      treasury: "Treasury balance",
      unavailable: "Unavailable",
      live: "Live from Solana devnet",
      setup: "Run npm run setup:devnet",
    },
    price: "Community price",
    priceNote: (feedIn: S, grid: S) =>
      `Fixed-price mode: every neighbour pays and earns this price. It must sit between the ${feedIn} ct feed-in tariff and the ${grid} ct grid price, so both sides beat their alternative.`,
    priceApplies: "Applies to intervals matched from now on.",
    exports: "Exports for grid operator and billing",
    exportsNote: "Final 15-minute allocations for one day, as CSV.",
    allocations: (day: S) => `Allocations ${day}`,
    anchors: "Anchor agreements",
    anchorLine: (name: S, days: S, from: S, to: S, cap: S, price: S) =>
      `${name}: ${days} ${from}–${to}, up to ${cap} kWh at ${price} ct`,
    weekdays: "weekdays",
    daily: "daily",
    members: "Members",
    memberTable: {
      member: "Member",
      type: "Type",
      solar: "Solar",
      battery: "Battery",
      use: "Yearly use",
      wallet: "Wallet",
    },
    unverified: " (unverified)",
    registrations: "Site registrations",
    registrationsNote: (grid: S) =>
      `Every attempt to register a meter and the grid operator's answer. Meters outside grid area ${grid} are rejected.`,
    noRegistrations:
      "No registrations yet. The demo homes were set up by the seed.",
    regTable: {
      when: "When",
      workspace: "Workspace",
      address: "Address",
      meter: "Meter",
      grid: "Grid area",
      result: "Result",
    },
    batches: "Settlement batches",
    marketSettings: "Market and payments",
    priceMode: "Price",
    fixedPrice: "Fixed community price",
    auctionPrice: "15-minute auction (energy trading)",
    settlementMode: "Payments",
    supplierPays: "The Stadtwerk pays sellers and bills buyers (Germany, §42c)",
    p2pPays:
      "Neighbours pay each other directly from their wallets (Austria, peer-to-peer)",
    marketNote:
      "Applies from the next interval and the next hourly settlement.",
    settlementKey: "Volty settlement key (buyers approve it as their spender)",
    batchMode: { supplier: "Stadtwerk", p2p: "Peer-to-peer" } as Record<S, S>,
    batchesNote:
      "One batch per hour. The memo on each transaction carries the batch id and a hash of the hour's allocations, so anyone can check a payment against the allocation.",
    batchTable: {
      hour: "Hour",
      status: "Status",
      recipients: "Recipients",
      paid: "Paid",
      hash: "Allocation hash",
      txs: "Transactions",
    },
  },
  auth: {
    loginTitle: "Log in to Volty",
    loginIntro:
      "Use your email (we send you a one-time code) or a passkey. New here?",
    createAccount: "Create an account",
    loginButton: "Log in with email or passkey",
    signupTitle: "Create your Volty account",
    signupIntro:
      "Sign up with your email (we send you a one-time code) or a passkey. There is no password and no seed phrase: a Solana wallet is created for you. Next you choose a Household or Business workspace. Already have an account?",
    signupButton: "Sign up with email or passkey",
    settingUp: "Setting up your account…",
    demoAccounts: "Demo accounts",
    demoAccountsNote:
      "For the hackathon demo only (DEMO_LOGIN=true). Switched off in production.",
    noWorkspaceYet: "No workspace yet",
    demoSignup: "Demo signup",
    demoSignupNote:
      "DEMO_LOGIN=true only: creates a local account with a made-up @kiezwatt.example address and a server-held devnet wallet.",
    yourName: "Your name",
    createDemo: "Create demo account",
    notConfigured:
      "No login method is configured. Set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_VERIFICATION_KEY, or DEMO_LOGIN=true for a local demo, in .env.local.",
    errors: {
      not_configured: "Privy login is not configured.",
      missing_token: "Missing login token.",
      invalid_token: "Invalid or expired login. Please log in again.",
      email_taken:
        "This email belongs to an account linked to a different login.",
      failed: "Login failed.",
    } as Record<S, S>,
  },
  workspaces: {
    firstTitle: "Create your first workspace",
    newTitle: "New workspace",
    intro:
      "A workspace is one household or one business. Each has its own wallet, balances and bills, and you switch between them from the workspace menu.",
    limit: (n: number) => `One login can own up to ${n} workspaces.`,
    loginAgain: "Log in again with Privy to create a workspace.",
    type: "Workspace type",
    kinds: [
      {
        id: "household",
        title: "Household",
        text: "Your home: sell your solar to neighbours, or buy theirs.",
      },
      {
        id: "sme",
        title: "Business",
        text: "A small business: buy local solar during opening hours, with an SME check.",
      },
    ],
    name: "Name",
    namePlaceholder: "e.g. Müller household or Bäckerei Müller",
    creating: "Creating workspace and wallet…",
    create: "Create workspace",
    confirm: "Confirm it's you to create a wallet for the new workspace.",
    confirmButton: "Confirm with email or passkey",
    errors: {
      choose_kind: "Choose Household or Business.",
      not_configured: "Privy login is not configured.",
      wallet_needed: "A wallet is needed for the new workspace.",
      login_expired: "Your login has expired. Log in again.",
      other_login: "That login belongs to someone else.",
      waiting_wallet: "Waiting for the new wallet…",
      wallet_timeout: "The new wallet didn't show up in time. Try again.",
      name_length: "Give the workspace a name of 2 to 60 characters.",
      too_many: "You've reached the maximum number of workspaces.",
      wallet_not_yours:
        "That wallet doesn't belong to your login yet. Try again in a moment.",
      wallet_in_use: "That wallet already belongs to another workspace.",
      failed: "Couldn't create the workspace.",
    } as Record<S, S>,
  },
  account: {
    title: "Your account",
    passkeyLogin: "Passkey login",
    demo: "demo account",
    privy: "logged in with Privy",
    since: (date: S) => `since ${date}`,
    workspaces: "Workspaces",
    newWorkspace: "New workspace",
    separate:
      "Each workspace has its own wallet, balances and bills. Nothing is shared between them.",
    noWorkspace: "No workspace yet.",
    createOne: "Create one",
    table: { name: "Name", type: "Type", wallet: "Payout wallet" },
    noWallet: "None yet",
    openNow: "Open now",
    siteNote: {
      before: "New workspaces have no meter yet: open the workspace and",
      link: "register its site",
      after:
        "(address, meter ID, solar, battery, EV charger). Business workspaces also pass the SME check on the SME page.",
    },
    delete: "Delete account",
    deleteText: (n: number) =>
      `Deletes your login, closes all ${n} workspaces and removes your name, rules and business details. Settled payments, meter readings and allocations are kept anonymously, because billing records must be kept for up to 10 years.`,
    deletePrivyWallets:
      " Your Privy wallets are deleted too: move any tEURC out of them first.",
    blockers: {
      pending:
        "Some energy hasn't been settled yet. Try again after the next hourly payout.",
      hosted_project:
        "A Solar Now, Pay Never roof you host is still funding or repaying investors.",
      open_investments: "You have investments that haven't been paid back yet.",
      last_admin:
        "This is the last Stadtwerk staff login. Add another staff member first.",
    } as Record<S, S>,
    typeDelete: "Type DELETE to confirm",
    wrongConfirm: "Type DELETE in capitals to confirm.",
    confirmWord: "DELETE",
    deleteButton: "Delete my account",
    verifiedNote: "You verified it's you. This step stays open for 5 minutes.",
    step1: "Step 1: verify it's you",
    expired: "Your verification expired after 5 minutes. Please verify again.",
    sendCode: "Send me a code",
    sendNewCode: "Send a new code",
    codeSent: "Demo: the code is printed in the terminal running the app.",
    wrongCode: "Wrong or expired code.",
    code: "6-digit code",
    verify: "Verify",
    privyNotConfigured: "Privy login isn't configured on this server.",
    verifyPrivy: "Verify it's you (log in again)",
    waitingLogin: "Waiting for your login…",
    verifyErrors: {
      no_privy: "This account has no Privy login.",
      other_user:
        "You logged in as someone else. Use this account's email or passkey.",
      too_old: "Please log in again; that login is too old.",
      invalid: "That login couldn't be verified.",
      no_token: "No login token.",
    } as Record<S, S>,
  },
  site: {
    title: "Your site",
    intro: (name: S, grid: S) =>
      `${name} · the meter this workspace buys and sells through. It must be in the community's grid area (${grid}).`,
    approved:
      "Approved: the grid operator confirmed your meter is in the community's grid area. It joins the matching from the next 15-minute interval.",
    rejected: "Rejected. The reason is in the list below.",
    noSite: "Only household and business workspaces have a site.",
    fields: {
      meter: "Meter (MaLo-ID)",
      grid: "Grid area",
      use: "Yearly use",
      solar: "Solar",
      battery: "Battery",
      ev: "EV charger",
    },
    notRecorded: "Not recorded",
    contact: "To change the address or meter, contact the Stadtwerk.",
    exactLocation: "Show my exact location on neighbours' maps",
    exactLocationNote:
      "Off by default: neighbours see your home at street level only.",
    register: "Register your site",
    demoMeters: "Demo grid operator: meters you can try",
    demoMetersNote:
      "The demo has no real grid operator, so it knows only these meters. The Koblenz ones are in another grid area and are rejected.",
    history: "Registration history",
    status: {
      pending: "Waiting for the grid operator",
      approved: "Approved",
      rejected: "Rejected",
    } as Record<S, S>,
    meter: "meter",
    form: {
      address: "Address",
      street: "Street and number",
      postcode: "Postcode",
      city: "Town",
      meterId: "Meter: market location ID (MaLo-ID)",
      meterHint:
        "11 digits, on your electricity bill. The grid operator uses it to confirm your grid area.",
      assets: "What's at this address",
      pv: "Solar, kWp",
      battery: "Battery, kWh",
      ev: "EV charger, kW",
      evHint: "e.g. 11; 0 if none",
      use: "Yearly use, kWh",
      useHint: "From your last bill",
      zeroIfNone: "0 if none",
      checking: "Checking with the grid operator…",
      submit: "Register site",
    },
    errors: {
      street: "Enter the street and house number.",
      postcode: "Enter a 5-digit German postcode.",
      city: "Enter the town or city.",
      meter_format:
        "That isn't a valid market location ID: 11 digits, as printed on your electricity bill.",
      pv: "Solar size must be between 0 and 100 kWp.",
      battery: "Battery size must be between 0 and 100 kWh.",
      ev: "EV charger power must be between 0 and 22 kW.",
      use: "Yearly use must be between 500 and 500,000 kWh.",
      wrong_kind: "Only household and business workspaces have a site.",
      has_site: "This workspace already has a site.",
      meter_taken: "This meter is already registered to another workspace.",
      failed: "Registration failed.",
    } as Record<S, S>,
    reasons: {
      unknown_meter: () =>
        "The grid operator doesn't know this meter ID. Check it against your electricity bill.",
      postcode_mismatch: (p: { postcode?: S; city?: S }) =>
        `This meter ID belongs to an address in ${p.postcode} ${p.city}, not the postcode you entered.`,
      outside_grid_area: (p: { gridAreaId?: S; communityGridAreaId?: S }) =>
        `This meter is in grid area ${p.gridAreaId}, outside the community's grid area (${p.communityGridAreaId}). Energy sharing under §42c EnWG only works within one grid area.`,
    },
  },
  statements: {
    title: "Statements",
    intro:
      "One statement per workspace and month: energy bought and sold, prices, fees, VAT and every payment on Solana.",
    none: "No statements yet: they appear once this workspace has bought or sold energy.",
    month: "Month",
    download: "Download PDF",
    heading: (month: S) => `Statement for ${month}`,
    docTitle: "Monthly statement",
    number: "Statement no.",
    period: "Period",
    issued: "Issued",
    meter: "Meter (MaLo-ID)",
    address: "Address",
    workspace: "Workspace",
    issuer: "Stadtwerk Vallendar (demo) · energy sharing under §42c EnWG",
    summary: "Summary",
    paidOut: "Paid to you on Solana",
    toBill: "Charged with your electricity bill",
    paidFromWallet: "Paid to neighbours from your wallet",
    outgoing: "to neighbours",
    unsettled: "Not settled yet (next hourly payout)",
    nettingNote:
      "When the Stadtwerk pays, purchases and sales in the same hour are netted: each hour you either receive a payout on Solana or owe the difference. In peer-to-peer hours you pay neighbours from your wallet and are paid by them separately.",
    bought: "Energy bought from neighbours",
    sold: "Energy sold",
    table: {
      price: "Price",
      kwh: "kWh",
      amount: "Amount",
      description: "Description",
    },
    atPrice: (ct: S) => `at ${ct}/kWh`,
    fedIn: (ct: S) => `fed into the grid, feed-in tariff ${ct}/kWh`,
    subtotal: "Total",
    vatIncluded: (rate: S, eur: S) => `incl. ${rate} VAT: ${eur}`,
    net: "Net",
    vat: "VAT",
    noVatSmall: "No VAT: private small-scale operator (§19 UStG)",
    noneBought: "No energy bought from neighbours this month.",
    noneSold: "No energy sold this month.",
    waterfall: "Solar Now, Pay Never: deductions from your sales",
    fee: "Volty fee",
    reserve: "Maintenance reserve for your roof",
    investors: "Repayment to the investors who funded your roof",
    toYou: "Credited to you",
    repayments: "Repayments from Solar Now, Pay Never roofs",
    repaymentsNote: "Loan repayments: not subject to VAT (§4 No. 8 UStG).",
    roof: (name: S) => `Roof: ${name}`,
    usage: "Your meter this month",
    usageRows: {
      load: "Used",
      fromNeighbours: "Of which from neighbours",
      fromGrid: "From the grid (billed by your supplier as usual)",
      generated: "Solar generated",
      exported: "Fed in",
    },
    payments: "Payments on Solana",
    paymentsNote:
      "Each payout is a transfer in EURC (tEURC on devnet) from the Stadtwerk's treasury. The links open the transaction on the Solana explorer.",
    noPayments: "No payouts this month.",
    paymentTable: {
      hour: "Hour",
      amount: "Amount",
      status: "Status",
      tx: "Transaction",
    },
    disclaimer:
      "Demo statement from simulated meter data on Solana devnet. Not a tax invoice.",
    page: (n: number, total: number) => `Page ${n} of ${total}`,
  },
  map3d: {
    region: {
      title: "The region: neighbouring energy communities",
      tabs: "Map view",
      tabNeighbourhood: "Neighbourhood",
      tabRegion: "Region",
      intro: (date: S) =>
        `${date}: what each community had left after its members shared, hour by hour, and the energy exchanged with ours. Press Play the day.`,
      you: "your community",
      allowed: "allowed",
      blocked: {
        from_2028: "allowed from 1 June 2028",
        not_sharing: "not energy sharing",
      } as Record<S, S>,
      level: {
        same_substation: "same substation",
        same_area: "same grid area",
        adjacent_area: "adjacent grid area",
        remote: "far away (ordinary supply)",
      } as Record<S, S>,
      kind: {
        trade: "paid exchange",
        credit: "borrowed / lent energy",
        repay: "repaid in energy",
        credit_settled: "credit paid in money",
      } as Record<S, S>,
      legendSurplus: "Surplus left over",
      legendShort: "Shortfall left over",
      summary: (inKwh: S, outKwh: S) =>
        `from neighbours ${inKwh} · to neighbours ${outKwh}`,
      surplus: (kwh: S) => `Surplus left: ${kwh}`,
      short: (kwh: S) => `Short: ${kwh}`,
      tipFlow: (from: S, to: S, kwh: S, kind: S) =>
        `${from} → ${to}\n${kwh} · ${kind}`,
      near: "Nearby",
      all: "All, incl. far away",
      off: "The federation is switched off: the Stadtwerk switches it on on the Federation page (the live demo does).",
      note: "Grid areas are drawn as boxes for illustration. Höhr-Grenzhausen is closer in kilometres than Hillscheid, but in the next grid area: grid position decides, not distance.",
      honesty:
        "The neighbouring communities are simulated and their grid areas illustrative.",
      toFederation: "Details and settlements on the Federation page →",
      noPeers:
        "No neighbouring communities yet: switch the federation on (Federation page, or run the live demo).",
    },
    title: "Neighbourhood in 3D",
    intro: (day: S) =>
      `Simulated day ${day}. Columns show each home's solar and use in the chosen hour; arcs show who supplied whom. Real power lines and transformers come from OpenStreetMap.`,
    rotateHint:
      "Drag to move · right-drag or Ctrl+drag to rotate and tilt · scroll to zoom",
    hour: "Hour",
    wholeDay: "Whole day",
    openFull: "Open full map",
    legendTitle: "Layers and legend",
    play: "Play the day",
    pause: "Pause",
    resetView: "Reset view",
    layers: "Show",
    layer: {
      buildings: "3D buildings",
      grid: "Power grid",
      flows: "Energy flows",
      columns: "Solar and use",
      area: "Grid area",
    },
    legend: {
      solar: "Solar generated (height = kWh)",
      use: "Electricity used (height = kWh)",
      flow: "Shared with a neighbour (width = kWh)",
      line380: "380 kV transmission line",
      line110: "110 kV line",
      minor: "Local line",
      transformer: "Transformer",
      substation: "Substation",
      area: (id: S) => `Grid area ${id} (outline illustrative)`,
    },
    lvNote:
      "Street-level low-voltage cables are mostly underground and not in OpenStreetMap; the grid operator's data would add them.",
    streetLevel: "shown at street level",
    you: "your home",
    tipSite: (name: S, solar: S, use: S) =>
      `${name}\nSolar: ${solar}\nUsed: ${use}`,
    tipFlow: (from: S, to: S, kwh: S) => `${from} → ${to}\n${kwh}`,
    tipLine: (kind: S) => kind,
    noData: "No simulated data yet. Run the simulator first.",
    attribution: "Map © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors",
  },
  demo: {
    live: {
      boundary: {
        substation: "same substation",
        area: "same grid area (allowed)",
        adjacent: "adjacent grid area (from 2028)",
      },
      title: "Live: energy between the communities",
      intro:
        "Every simulated hour, what each community has left after its own members shared (bars: orange surplus, blue shortfall) and the energy flowing between ours and the neighbours. Faded with ✕: not allowed to share with us, and why. Each hour's exchanges are paid on Solana with the rest of the hour.",
      ticker: "Latest exchanges",
      settled: "settled on Solana",
    },
    homeTitle: "Live demo",
    homeText:
      "One click switches on energy trading, peer-to-peer payments and the AI trading agents, lets the payment agent set up the demo wallets, and simulates a sunny day with every payment settled on Solana devnet. A guided tour then walks through each kind of member.",
    run: "Run the live demo",
    againShort: "Run the demo again",
    runningShort: "Demo running…",
    stoppingShort: "Stopping after this hour…",
    stop: "Stop",
    stopHint:
      "Stops the demo once the current hour is settled, so no payment is left half done.",
    reset: "Reset",
    resetHint:
      "Stops the demo and clears its progress and live view. Simulated hours and Solana payments stay; the next run continues from the simulation clock.",
    length: "Length",
    hours: (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`,
    guide: "Demo guide",
    notAvailable:
      "The live demo is only available on demo setups (DEMO_LOGIN=true) or for Stadtwerk staff.",
    title: "Live demo",
    intro:
      "Start it, then talk through the steps while it runs (2–4 minutes with real devnet payments). The tour below opens each page logged in as the right person.",
    start: "Run the live demo",
    again: "Run again (continues with the next day)",
    steps: {
      settings:
        "Switch on energy trading (15-minute auction), peer-to-peer payments and the federation with neighbouring communities",
      agents:
        "Switch on the AI trading agents: Anna's smart battery, and smart charging for Ben's car (the demo adds an 11 kW wallbox to his site)",
      ai: "Wake the open-source language and voice models on this server (Ollama, Whisper, Piper)",
      wallets:
        "Prepare wallets: the payment agent sets Ben's and the bakery's limits; Dana stays unapproved",
      simulate: "Simulate the day and settle every hour on Solana devnet",
    } as Record<S, S>,
    status: {
      waiting: "Waiting",
      running: "Running…",
      done: "Done",
      skipped: "Skipped: devnet isn't set up",
      failed: "Failed",
    } as Record<S, S>,
    aiSkipped:
      "Skipped: Ollama isn't running, so the agent page explains with plain facts. Start it with: ollama serve",
    progress: (done: number, total: number) => `${done} of ${total} hours`,
    finished: "Finished. Follow the tour below.",
    table: {
      hour: "Hour",
      shared: "Shared",
      price: "Market price",
      neighbours: "Neighbours, kWh in · out",
      paid: "Paid",
      tx: "Solana",
    },
    offChain:
      "Devnet isn't set up, so payments are recorded but not sent. Run npm run setup:devnet for real transfers.",
    tour: "Guided tour",
    tourIntro:
      "Go through the steps in order (about 8 minutes). Each button logs you in as that person and opens the page. The DE | EN switch in the top bar changes the language at any time.",
    open: (who: S) => `Open as ${who}`,
    tourSteps: [
      {
        title: "1. The Stadtwerk switches on trading",
        points: [
          "Market and payments: the 15-minute auction and peer-to-peer payments are on.",
          "Settlement batches: each hour is marked peer-to-peer, with its Solana transactions. Open one in the explorer: the memo names the hour, and the transfers come from buyers' wallets.",
          "Dana hasn't approved a limit, so for her purchases the Stadtwerk pays instead; sellers are still paid.",
          "Click a batch's hash: the public record (no login) shows the hour's trades under pseudonymous codes and checks their hash against the Solana memo: ✓ Verified.",
        ],
      },
      {
        title: "2. The federation: trading with neighbouring communities",
        points: [
          "Say first: our neighbourhood can't always use its own solar, and some evenings it's short. Neighbouring energy communities have the opposite problem at other times.",
          "Today with the neighbours (top of the page): one line per community. Bought from the Hillscheid solar co-op (paid), borrowed from Mallendar and repaid in energy later, sold to the Vallendar-Nord business park.",
          "The two that were never used, and why: Höhr-Grenzhausen is in the next grid area (energy sharing there is only allowed from June 2028), and Cochem, 43 km away, would be ordinary supply. Point at the nested grid levels: the model always picks the nearest allowed community, and a chain A → B → C wouldn't help, because power follows the grid, not contracts.",
          "Next 24 hours: the recommended partner and the best exchange each hour, from the forecasts.",
          "Exchanged so far: the payments between the communities' treasuries, each a Solana transaction. Then click See it on the map.",
        ],
      },
      {
        title: "3. A seller: the market price and the learned forecast",
        points: [
          "The header shows the market price now; the chart shows it fall on a sunny midday and rise when power is scarce.",
          "The battery forecast says why it expects what it does, and is learned from Anna's own meter data: its error is shown next to the fixed solar model's.",
          "Payouts on Solana: every hour, paid directly from the neighbours' wallets.",
          "Selling rules: her minimum price and evening battery reserve are what her trading agent bids with.",
        ],
      },
      {
        title: "4. The AI agent: deciding, explaining, listening",
        points: [
          "What your agent did: Friday evening it sold from Anna's battery at the best price left, but kept what her home needs until sunrise; at Saturday noon it stored solar because the evening pays more.",
          "Explain in plain words, then Listen: a language model on this server explains the decisions, and an open-source voice reads it out (DE or EN).",
          "Tell your agent, typed or spoken: e.g. “Never sell below 18 cents.” It shows the change first; nothing applies until you press Apply.",
          "The decisions themselves come from forecasts (the market run a day ahead), not from the language model.",
        ],
      },
      {
        title: "5. A receiver: paying neighbours from his own wallet",
        points: [
          "Pay your neighbours directly: his balance, the limit he approved, and the payment agent's suggestion based on what he usually buys.",
          "Payments: what he paid each neighbour, with Solana links.",
          "Next 24 hours: planned supply from the learned forecasts, with a backup if clouds come, chosen by how reliable each seller is at that hour.",
          "Potential suppliers: your agent's pick, ranked by what each seller is likely to deliver.",
          "Revoke and approve live to show that he stays in control. Then his AI agent page: the car's charging plan and what it saved.",
        ],
      },
      {
        title: "6. A small business: SME check, anchor agreement, statement",
        points: [
          "SME status: sharing energy, check valid for a year. A failed or expired check stops it trading.",
          "The anchor agreement buys the midday surplus at a fixed price before the auction.",
          "Then Statements → Download PDF: purchases at fixed and market prices, VAT, and what it paid neighbours from its wallet.",
        ],
      },
      {
        title: "7. Solar Now, Pay Never: investors repaid by every sale",
        points: [
          "Weber's roof: repayment progress and the latest repayments on Solana.",
          "In peer-to-peer hours investors are paid straight from buyers' wallets, as part of each purchase.",
          "“On Solana”: the roof-split program's own account shows what it has paid investors. Every payment to the roof goes through it, so nobody can pay them differently.",
        ],
      },
      {
        title: "8. The neighbourhood in 3D",
        points: [
          "Press Play the day: solar columns grow at noon and arcs show who traded with whom.",
          "Right-drag to rotate. The real power grid comes from OpenStreetMap.",
          "Switch to Region: the neighbouring communities, coloured by grid level, with columns for what each had left and arcs for the energy exchanged with ours. “All, incl. far away” zooms out to Cochem.",
        ],
      },
    ],
  },
  market: {
    title: "Today's market price",
    note: (floor: S, cap: S) =>
      `One price per 15 minutes from the neighbourhood auction: low when sun is plentiful, higher when it's scarce. It never goes below the ${floor} ct feed-in tariff or above the ${cap} ct grid price. Anchor agreements keep their fixed price.`,
    now: (ct: S) => `market price now ${ct}`,
    average: (ct: S) => `today's average ${ct}`,
    price: "Price, ct/kWh",
    traded: "traded",
    noTrades: "No trades yet today.",
    tooltipPrice: (ct: S) => `${ct} per kWh`,
  },
  wallet: {
    ownWallet: {
      approve: "Approve with my wallet",
      revoke: "Revoke with my wallet",
      signing: "Signing in your wallet…",
      approved:
        "Approved: your wallet signed the limit. Volty can now pay your neighbours from it, never more than that.",
      revoked: "Revoked: Volty can no longer spend from your wallet.",
      note: "You sign this in your own wallet (Privy). Volty only pays the network fee and never holds your key.",
      notConnected:
        "Log in with Privy in this browser to sign with your wallet.",
    },
    title: "Pay your neighbours directly",
    intro:
      "Peer-to-peer mode: every hour you pay the neighbours you bought from straight from your wallet, within a monthly limit you approve. Volty's settlement key can't take more than that, and you can revoke it any time. If your limit or balance runs out, the Stadtwerk covers the hour and bills you as usual.",
    balance: "Wallet balance",
    approved: "Approved for Volty",
    notApproved: "Not approved",
    topUp: "Top up 25 tEURC",
    limit: "Monthly limit, €",
    approve: "Approve limit",
    revoke: "Revoke",
    demoNote:
      "Demo wallet: the server signs as you. With your own wallet you'd approve this in the wallet app.",
    realWallet:
      "Privy login isn't set up on this server, so you can't sign with your own wallet here; the Stadtwerk covers your purchases meanwhile.",
    unavailable: "Solana devnet can't be reached right now.",
    supplierMode:
      "The Stadtwerk pays your neighbours and bills you monthly (Germany, §42c).",
    agentTitle: "Payment agent",
    agentSuggests: (kwh: S, price: S, need: S, limit: S) =>
      `From your last 14 days (about ${kwh} a day from neighbours at about ${price}), the rest of this month needs about ${need}. It suggests a limit of ${limit}, with a 20% buffer.`,
    agentApply: (limit: S) => `Let the agent set ${limit}`,
  },
  charts: {
    fromNeighbours: "from neighbours",
    unitHour: "kWh per hour",
    unitQuarter: "kWh per 15 minutes",
    unitKwh: "kWh",
    unitCt: "ct per kWh",
    floor: (ct: S) => `feed-in ${ct}`,
    cap: (ct: S) => `grid ${ct}`,
    battery: "In the battery",
    forecastLine: "Forecast",
    range: "Likely range",
    generation: "Solar generation",
    price: "Market price",
    generated: "generated",
    inBattery: "in the battery",
    forecast: "forecast",
    expected: "expected",
    likelyRange: "likely range",
    capacity: (kwh: S) => `Capacity ${kwh} kWh`,
    now: "Now",
    yourUtility: "Your utility",
    usage: (name: S) => `${name} usage`,
    used: (name: S) => `${name} used`,
    surplus: "Neighbourhood solar surplus",
    surplusShort: "neighbourhood surplus",
    solarGenerated: "Solar generated",
    usedByNeighbours: "Used by neighbours",
  },
  agent: {
    title: "Your trading agent",
    intro:
      "Your agent trades for this workspace every 15 minutes. It decides from forecasts: your home's learned solar and use, and the market run a day ahead on every neighbour's forecast. You set the limits: in your own words, by voice, or with the switches.",
    noSite:
      "This workspace has no site, so there is nothing for an agent to trade.",
    switches: "What your agent may do",
    smartBattery: "Smart battery",
    smartBatteryNote:
      "Stores midday solar when the evening will pay more, and sells from the battery in the evening. It always keeps what your home needs until the sun is back.",
    smartEv: "Smart EV charging",
    smartEvNote:
      "Charges the car in the cheapest quarter-hours before it leaves, instead of at full power the moment it's plugged in.",
    readyBy: "Car ready by (weekdays)",
    noBattery: "No battery registered for this site.",
    noEv: "No EV charger registered for this site.",
    supplierPick: "Choosing suppliers",
    supplierPickNote:
      "On the receiver page, your agent ranks sellers by what they are likely to deliver: their forecast, weighed by how often they really had surplus at those hours.",
    tell: "Tell your agent",
    tellNote:
      "Write or say what you want, for example: “Never sell below 18 cents, and let Ben have my solar first.” A language model running on this server turns it into settings. Nothing changes until you press Apply.",
    placeholder:
      "e.g. Charge my car as cheaply as possible, but it must be ready by 6.",
    examples: [
      "Sell from my battery in the evening when it pays more",
      "Don't pay neighbours more than 22 cents",
      "Buy only within 1 km and prefer the Webers",
    ],
    ask: "Ask the agent",
    thinking: "The language model is thinking…",
    record: "🎙 Speak",
    stop: "■ Stop",
    transcribing: "Transcribing…",
    proposal: "Proposed changes",
    noChanges:
      "No changes: that matches your current settings, or it isn't something the agent can set.",
    apply: "Apply",
    discard: "Discard",
    applied:
      "Applied. The agent uses the new settings from the next 15-minute interval.",
    clamped: "adjusted to the allowed range",
    on: "on",
    off: "off",
    none: "nobody",
    oclock: (h: number) => `${String(h).padStart(2, "0")}:00`,
    problems: {
      unknown_neighbour: (name: S) =>
        `“${name}” isn't a member of this community.`,
      no_solar: "You have no solar, so there is nothing to sell.",
      no_battery: "This site has no battery.",
      no_ev: "This site has no EV charger.",
      unsupported: (text: S) => `Not something the agent can do: ${text}`,
    },
    fields: {
      sellerMinPriceCt: "Minimum selling price",
      batteryReserveKwh: "Battery reserve for the evening",
      priorityBuyers: "Get your solar first",
      buyerMaxPriceCt: "Maximum buying price",
      maxDistanceM: "Maximum distance",
      preferredSellers: "Preferred sellers",
      blockedSellers: "Blocked sellers",
      smartBattery: "Smart battery",
      smartEv: "Smart EV charging",
      evReadyByHour: "Car ready by",
    },
    log: "What your agent did",
    logNote:
      "Each decision with the numbers behind it. Battery decisions are logged when they change.",
    nothingYet:
      "Your agent hasn't made any decisions yet. Switch it on, then run the live demo or the simulation.",
    explain: "Explain in plain words",
    explaining: "Explaining…",
    listen: "🔊 Listen",
    speaking: "Preparing the voice…",
    byModel: (model: S) => `Written by ${model}, running on this server.`,
    plainFacts:
      "The language model isn't running, so here are the plain facts.",
    models: {
      title: "Open-source models used (all on this server, no API key)",
      llm: (model: S) => `Language: ${model} via Ollama`,
      stt: "Speech to text: Whisper base (OpenAI, MIT licence)",
      tts: "Voice: Piper voices Thorsten (German, CC0) and LibriTTS-R (English, CC BY 4.0), pronounced with eSpeak NG (GPL-3.0)",
      ready: "ready",
      notRunning: "Ollama isn't running. Start it with: ollama serve",
      notPulled: (model: S) =>
        `Model not downloaded yet. Run: ollama pull ${model}`,
      voiceNote:
        "The voice models download once (about 220 MB) the first time you speak or listen.",
    },
    errors: {
      model:
        "The language model didn't answer. Is Ollama running (ollama serve)?",
      voice: "The voice model failed. See the server log.",
      mic: "The browser blocked the microphone.",
      silence:
        "No speech heard. Check the microphone and speak after pressing Speak.",
      empty: "Write or say something first.",
    } as Record<S, S>,
    decisions: {
      battery_hold: (now: S, later: S) =>
        `Stored solar in the battery: selling now pays ${now}, this evening should pay ${later}.`,
      battery_sell_now: (now: S, later: S, need: S) =>
        `Sold the surplus straight away at ${now}: storing it for the evening (${later}) wouldn't pay after battery losses. Kept ${need} for your home tonight.`,
      battery_keep: (need: S, soc: S) =>
        `Kept the battery (${soc}) for your own use: your home needs about ${need} until the sun is back.`,
      battery_discharge: (kwh: S, now: S, need: S) =>
        `Sold ${kwh} per quarter-hour from the battery at ${now}, the best price left tonight. ${need} stays for your home.`,
      ev_plan: (need: S, from: S, to: S, planned: S, asap: S, leaves: S) =>
        `Planned the car's ${need} between ${from} and ${to} (ready by ${leaves}): ${planned}, against ${asap} if charged straight away.`,
      rules: (fields: S) => `You changed: ${fields}.`,
    },
  },
  verify: {
    title: "Public record",
    intro:
      "Every settled hour is published here: each trade under a pseudonymous site code, with its SHA-256 written into the memo of that hour's Solana transactions. Anyone can recompute the hash and compare it with the chain, so nobody, not even Volty, can change the record afterwards without it showing.",
    noneYet: "No settled hours yet.",
    hour: "Hour",
    status: "Status",
    hash: "SHA-256",
    p2p: "peer-to-peer",
    check: "Check",
    hourTitle: (day: S, from: S, to: S) => `${day}, ${from}–${to}`,
    verdict: {
      match: "✓ Verified: the published record matches the hash on Solana.",
      mismatch: "✗ Does not match: the record differs from the hash on Solana.",
      legacy:
        "Settled before full hashes were published: the memo holds only a short hash, so this hour can't be checked.",
      unavailable:
        "Solana couldn't be reached to read the memo. Try again in a moment.",
      none: "Not paid on-chain (simulated), so there is no memo to compare with.",
    } as Record<S, S>,
    recomputed: "Hash of the record, computed now",
    onChain: "Hash in the Solana memo",
    viewTx: "view transaction",
    stored: "Hash stored at settlement",
    storedSame: "same",
    storedDifferent:
      "different (the hour was settled with an older record format)",
    howTo:
      "Check it yourself, without trusting this page: download the record and hash it.",
    download: (bytes: S) => `Download the record (JSON, ${bytes} bytes)`,
    trades: (n: number) => `${n} trades in this hour`,
    tradesNote:
      "Codes are pseudonymous: each member sees their own code on their site page. “Grid” is a funded roof's power fed into the grid at the feed-in tariff.",
    time: "Time",
    from: "From",
    to: "To",
    price: "Price",
    grid: "Grid (feed-in)",
    yourCode: "Your public code",
    yourCodeNote:
      "Your trades appear under this code in the public record. Only you can link it to your name.",
    open: "Open the public record",
  },
  federation: {
    toYou: "to you",
    fromYou: "from you",
    netIn: (kwh: S) => `${kwh} in`,
    netOut: (kwh: S) => `${kwh} out`,
    cannotShare: "Can't share with us",
    short: {
      from_2028: "next grid area: from June 2028",
      not_sharing: "too far in the grid: ordinary supply",
    } as Record<S, S>,
    kpiIn: "From neighbours",
    kpiOut: "To neighbours",
    kpiSaved: "Saved vs. grid price",
    kpiEarned: "Earned above feed-in",
    perCommunity: "Per community",
    colIn: "In",
    colOut: "Out",
    colPaid: "We paid",
    colReceived: "We received",
    latestSettlements: "Latest settlements on Solana",
    weePaid: "we paid",
    theyPaid: "paid us",
    todayTitle: (day: S, time: S) =>
      `Today with the neighbours (${day}, until ${time})`,
    onMap: "See it on the map",
    nothingToday:
      "Nothing exchanged today: when we needed energy they had none to spare, and the other way round.",
    notUsed: {
      from_2028:
        "Not used: adjacent grid area, energy sharing allowed from 1 June 2028.",
      not_sharing:
        "Never used: too far away in the grid; this would be ordinary supply, not energy sharing.",
    } as Record<S, S>,
    flowKind: {
      trade: "paid",
      credit: "borrowed / lent",
      repay: "repaid in energy",
      credit_settled: "credit paid in money",
    } as Record<S, S>,
    title: "Federation of energy communities",
    intro:
      "What the members can't share among themselves goes to neighbouring energy communities: surplus to a community that is short, missing energy from one with surplus. Power always flows through the one connected grid, so what matters is how close two communities are in it. The model always picks the nearest community that is allowed to help.",
    on: "Federation on",
    off: "Federation off",
    enable: "Trade with neighbouring communities",
    priceNote: (price: S, limit: S) =>
      `paid trades at ${price}/kWh, halfway between feed-in tariff and grid price; energy credits up to ${limit} kWh per community`,
    offAdmin:
      "Switch the federation on above to match the community's leftover surplus and demand with its neighbours.",
    offMember: "The Stadtwerk hasn't switched the federation on yet.",
    levelsTitle: "Where the neighbours are in the grid",
    levelsNote:
      "Closer is better: the nearer two communities are, the fewer grid levels their exchange uses.",
    you: "you",
    level: {
      same_substation: "Same substation",
      same_area: "Same grid area (§42c, allowed)",
      adjacent_area: "Adjacent grid area (§42c, from 1 June 2028)",
      remote: "Further away: ordinary supply, not energy sharing",
    } as Record<S, S>,
    chainNote:
      "Why there are no chains of communities (A gets from B, B gets from C): energy doesn't travel along contracts, so a chain nets out to C supplying A. It uses no less grid, and it can't stretch the legal limit of energy sharing.",
    allowed: "allowed",
    blocked: {
      from_2028: "from 1 June 2028",
      not_sharing: "not energy sharing",
    } as Record<S, S>,
    adviceTitle: (day: S, time: S) =>
      `Next 24 hours, from ${day} ${time}: best communities to exchange with`,
    pick: (name: S) => `Recommended: ${name}.`,
    pickWhy: (level: S, inKwh: S, outKwh: S) =>
      `${level}; expected to supply us ${inKwh} and take ${outKwh} of our surplus.`,
    noPick:
      "No exchange expected: in the next 24 hours no allowed neighbour can help with what we'll have left.",
    adviceSummary: (
      short: S,
      covered: S,
      left: S,
      sold: S,
      saving: S,
      extra: S,
    ) =>
      `We expect to be short ${short} and to have ${left} left over. Neighbours can cover ${covered} and take ${sold}: ${saving} saved against the grid price and ${extra} more than the feed-in tariff.`,
    adviceNote:
      "Forecast: our side from the members' learned forecasts after local sharing, theirs from the same weather and their mix of homes, businesses and solar.",
    table: {
      hour: "Hour",
      short: "Short",
      left: "Left over",
      best: "Best exchange",
      community: "Community",
      level: "Grid level",
      status: "Status",
      exchanged: "Exchanged (in · out)",
      credit: "Energy credit",
      mode: "Mode",
    },
    from: "from",
    to: "to",
    grid: "grid",
    peersTitle: "Neighbouring communities",
    weOwe: (kwh: S) => `we owe ${kwh}`,
    theyOwe: (kwh: S) => `they owe ${kwh}`,
    mode: { trade: "paid every hour", credit: "energy credit" } as Record<S, S>,
    active: "active",
    modeNote:
      "Energy credit: energy is borrowed or lent and repaid in kind as soon as the other side is short and we have surplus (or the other way round), oldest first. Credits not repaid within 30 days are paid in money at the federation price.",
    historyTitle: "Exchanged so far",
    history: (inKwh: S, outKwh: S, saving: S, extra: S) =>
      `${inKwh} from neighbours, ${outKwh} to them: ${saving} saved against the grid price, ${extra} earned above the feed-in tariff.`,
    paid: (name: S, eur: S) => `We paid ${name} ${eur}`,
    received: (name: S, eur: S) => `${name} paid us ${eur}`,
    historyNote:
      "Every hour the money settles on Solana between the communities' treasuries, and the exchanges are part of the hour's public record.",
    honesty:
      "Demo: the neighbouring communities are simulated (same weather, their own mix), and their places in the grid are illustrative; a real federation gets them from the grid operator. Savings stay with the community's Stadtwerk for now.",
  },
  livePayments: {
    receivedTitle: "Payments received, live",
    paidTitle: "Payments made, live",
    note: "One line per hour: everything paid in that hour, settled on Solana as soon as the hour closes. New ones light up as they arrive.",
    more: (n: number) => `+${n} more`,
    from: (name: S) => `from ${name}`,
    to: (name: S) => `to ${name}`,
    noneReceived: "No payments received yet.",
    nonePaid: "No payments made yet.",
  },
};

export type Messages = typeof en;
