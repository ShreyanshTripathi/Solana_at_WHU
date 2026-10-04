import type { Messages } from "./en";

// Alle Texte der Oberfläche auf Deutsch, in der Form von en.ts (TypeScript prüft, dass nichts fehlt).
// Anrede mit „Sie“, wie bei Stadtwerken üblich.

type S = string;

export const de: Messages = {
  meta: {
    description:
      "Energy Sharing in der Nachbarschaft, abgerechnet alle 15 Minuten auf Solana",
  },
  common: {
    you: "Sie",
    none: "Keine",
    save: "Speichern",
    saveRules: "Regeln speichern",
    view: "ansehen",
    yes: "ja",
    no: "nein",
    unknown: "Unbekannt",
    loading: "Wird geladen…",
    open: "Öffnen",
    rulesApplyFromNow:
      "Änderungen gelten für alle ab jetzt zugeordneten Intervalle.",
    asOf: (day: S, time: S) => `${day}, Stand ${time} Uhr`,
    kind: {
      household: "Haushalt",
      sme: "Unternehmen",
      investor: "Investor",
      supplier: "Stadtwerk",
      platform: "Plattformgebühren",
    },
    batchStatus: {
      open: "Wird vorbereitet",
      submitted: "Gesendet, Bestätigung ausstehend",
      confirmed: "Auf Solana bezahlt",
      simulated: "Simuliert (keine Überweisung)",
      failed: "Fehlgeschlagen, wird wiederholt",
      pending: "Noch nicht bezahlt",
    },
    batchStatusShort: {
      open: "Vorbereitung",
      submitted: "Gesendet",
      confirmed: "Bezahlt",
      simulated: "Simuliert",
      failed: "Fehlgeschlagen",
      pending: "Offen",
    } as Record<S, S>,
    language: "Sprache",
    autoRefresh: "Aktualisiert sich automatisch",
    live: "Live",
  },
  nav: {
    seller: "Erzeuger",
    receiver: "Bezieher",
    sme: "KMU",
    projects: "Solar Now, Pay Never",
    statements: "Abrechnungen",
    map3d: "3D-Karte",
    agent: "KI-Agent",
    federation: "Verbund",
    admin: "Stadtwerk-Verwaltung",
    logIn: "Anmelden",
    signUp: "Registrieren",
    logOut: "Abmelden",
    noWorkspace: "Kein Arbeitsbereich",
    mySite: "Mein Standort",
    newWorkspace: "+ Neuer Arbeitsbereich",
    accountSettings: "Kontoeinstellungen",
  },
  home: {
    eyebrow: "Energy Sharing nach §42c EnWG · Live-Demo auf Solana Devnet",
    tagline:
      "Nachbarn bezahlen sich jede Stunde gegenseitig für Solarstrom, direkt aus der eigenen Wallet.",
    pitch: (feedIn: S, grid: S, community: S) =>
      `Wer Solarstrom erzeugt, bekommt rund ${feedIn} ct/kWh Einspeisevergütung; die Nachbarin zahlt rund ${grid} ct. Mit Volty handeln beide dazwischen (${community} ct oder ein Viertelstunden-Marktpreis). Jede Stunde bezahlen Käufer ihre Nachbarn und die Investoren der Anlage direkt in Euro-Stablecoins auf Solana, innerhalb eines Limits, das jeder Käufer selbst setzt und widerrufen kann. Ein Solana-Programm teilt jede Zahlung an eine finanzierte Anlage auf, und jede Stunde wird mit einem Hash auf der Blockchain veröffentlicht, den jede Person prüfen kann.`,
    ctaVerify: "Öffentliches Protokoll prüfen",
    ctaSeller: "Dashboard eines Erzeugers ansehen",
    ctaStadtwerk: "Ansicht des Stadtwerks",
    deleted: "Ihr Konto wurde gelöscht und Sie wurden abgemeldet.",
    noData:
      "Noch keine Daten. Führen Sie npm run db:push, npm run seed und npm run sim aus.",
    community: (
      name: S,
      households: number,
      businesses: number,
      investors: number,
    ) =>
      `${name} · ${households} Haushalte, ${businesses} Unternehmen, ${investors} Investoren`,
    simulatedUpTo: (day: S, time: S) => ` · simuliert bis ${day}, ${time} Uhr`,
    tiles: {
      shared: "Zwischen Nachbarn geteilt",
      sharedSub: (days: number) => `In ${days} simulierten Tagen`,
      paid: "Auf Solana ausgezahlt",
      paidSub: (n: number) => `${n} bestätigte stündliche Auszahlungen`,
      homes: "Häuser mit Solaranlage",
      homesValue: (a: number, b: number) => `${a} von ${b}`,
      homesSub: "Die anderen kaufen bei ihnen",
      co2: "Vermiedenes CO₂",
      co2Sub: "Gegenüber dem deutschen Strommix",
    },
    dayTitle: (day: S, share: S) =>
      `Am ${day} haben Nachbarn ${share} des Solarstroms im Viertel genutzt`,
    dayNote: (generated: S, shared: S) =>
      `kWh pro Stunde: ${generated} erzeugt, ${shared} nebenan verbraucht. Der Rest lud Batterien, versorgte die Häuser der Erzeuger selbst oder ging ins Netz.`,
    howItWorks: "So funktioniert es",
    steps: [
      {
        title: "Messen",
        text: "Smart Meter melden jede Viertelstunde Erzeugung und Verbrauch.",
      },
      {
        title: "Zuordnen",
        text: "Erst lokale Betriebe, dann die nächsten Nachbarn, zu einem gemeinsamen Preis.",
      },
      {
        title: "Bezahlen",
        text: "Das Stadtwerk bezahlt die Erzeuger stündlich in EURC auf Solana.",
      },
      {
        title: "Zurückzahlen",
        text: "Von Investoren finanzierte Dächer teilen jeden Verkauf und zahlen sie automatisch zurück.",
      },
    ],
    explore: "Die Demo erkunden",
    views: [
      {
        title: "Erzeuger",
        who: "Scheunendach der Familie Weber, 30 kWp",
        text: "Erzeugung, Batterieprognose, Abnehmer und stündliche Auszahlungen auf Solana.",
      },
      {
        title: "Bezieher",
        who: "Bäckerei Müller",
        text: "Woher jede Viertelstunde Strom kam, Zahlungen und die nächsten 24 Stunden.",
      },
      {
        title: "Kleines Unternehmen",
        who: "Bäckerei Müller",
        text: "KMU-Prüfung und die Ankervereinbarung für den Überschuss zur Mittagszeit.",
      },
      {
        title: "Solar Now, Pay Never",
        who: "Investoren und Dachgeber",
        text: "Ein Dach finanzieren und zusehen, wie jeder Verkauf die Investoren zurückzahlt.",
      },
      {
        title: "Stadtwerk-Verwaltung",
        who: "Stadtwerk Vallendar",
        text: "Gemeinschaftspreis, Mitglieder, jeder Auszahlungslauf und Exporte.",
      },
    ],
    latestPayouts: "Letzte Auszahlungen auf Solana",
    latestPayoutsNote:
      "Eine Transaktion pro Stunde aus der Kasse des Stadtwerks. Jede enthält einen Hash der Zuordnungen dieser Stunde.",
    noPayouts:
      "Noch keine Auszahlungen. Starten Sie den Simulator mit --settle.",
    table: {
      hour: "Stunde",
      recipients: "Empfänger",
      paid: "Ausgezahlt",
      transaction: "Transaktion",
    },
    footer:
      "Demo für den WHU Hackathon 2026. Zählerdaten sind simuliert; Auszahlungen nutzen einen Test-Euro-Token auf Solana Devnet.",
  },
  seller: {
    title: "Erzeuger-Dashboard",
    empty: {
      before: "Für diesen Arbeitsbereich gibt es noch keine Solardaten.",
      link: "Registrieren Sie Ihren Standort",
      after:
        "mit seiner Anlage; Erzeugung und Auszahlungen erscheinen nach den nächsten simulierten Intervallen.",
    },
    choose: "Erzeuger wählen",
    batteryKwh: (kwh: S) => ` · ${kwh} Batterie`,
    tiles: {
      generatingNow: "Aktuelle Erzeugung",
      today: (kwh: S) => `${kwh} heute`,
      batteryNow: "Batterie jetzt",
      batteryOf: (pct: S, cap: S) => `${pct} von ${cap}`,
      battery: "Batterie",
      noBatterySub: "Überschuss geht direkt an Nachbarn",
      batteryEnd: "Batterie am Tagesende",
      batteryForecast: "Batterie um 23:45 Uhr (Prognose)",
      measured: "Gemessen",
      likely: (lo: S, hi: S) => `Voraussichtlich ${lo}–${hi} kWh`,
      sold: "Heute an Nachbarn verkauft",
      soldSub: (kwh: S, extra: S, feedIn: S) =>
        `${kwh} · ${extra} mehr als die Einspeisevergütung von ${feedIn} ct`,
      paid: "An Sie ausgezahlt",
      paidSub: "Auf Solana, jede Stunde",
      toPay: "Noch auszuzahlen",
      nextPayout: (time: S) => `Nächste Auszahlung um ${time} Uhr`,
    },
    generationTitle: (kwh: S, kw: S, time: S) =>
      `Heute ${kwh} erzeugt, Spitze ${kw} kW um ${time} Uhr`,
    generationNote: "Solarerzeugung pro Viertelstunde, kWh",
    batteryEnded: (kwh: S) => `Die Batterie endete den Tag mit ${kwh}`,
    batteryExpected: (kwh: S, lo: S, hi: S) =>
      `Die Batterie endet den Tag voraussichtlich mit ${kwh} (wahrscheinlich ${lo}–${hi} kWh)`,
    batteryNote:
      "Energie in der Batterie, kWh. Durchgezogen: gemessen. Gestrichelt: Prognose. Schattiert: wahrscheinlicher Bereich.",
    reasonUp: (solar: S, use: S, hours: S) =>
      `Warum: In den verbleibenden ${hours} Stunden Tageslicht werden noch rund ${solar} Solarstrom erwartet, mehr als die ${use}, die Sie bis Mitternacht üblicherweise verbrauchen.`,
    reasonDown: (solar: S, use: S, hours: S) =>
      `Warum: In den verbleibenden ${hours} Stunden Tageslicht werden nur noch rund ${solar} Solarstrom erwartet, weniger als die ${use}, die Sie bis Mitternacht üblicherweise verbrauchen.`,
    reasonCapped: (reserve: S) =>
      ` Ihre Abendreserve begrenzt das Laden auf ${reserve}.`,
    learnedNote: (days: number, learned: S, fixed: S) =>
      `Prognose gelernt aus Ihren Zählerdaten der letzten ${days} Tage. Gestern lag sie um ${learned} daneben, das feste Solarmodell um ${fixed}.`,
    learningNote: (days: number) =>
      `Lernt aus Ihren Zählerdaten (bisher ${days} von 3 Tagen); bis dahin gilt das feste Solarmodell.`,
    suppliedToday: "Wen Sie heute versorgt haben",
    noSales: "Heute noch keine Verkäufe.",
    table: {
      buyer: "Abnehmer",
      kwh: "kWh",
      price: "Preis",
      amount: "Betrag",
      status: "Status",
    },
    orderStatus: {
      settled: "Abgerechnet",
      partly: "Teilweise abgerechnet",
      delivered: "Geliefert",
    },
    alsoBought: (eur: S) =>
      `Sie haben außerdem für ${eur} bei Nachbarn gekauft; das steht in Ihrer Monatsabrechnung.`,
    payouts: "Auszahlungen auf Solana",
    noPayouts: "Heute noch keine Auszahlungen.",
    waterfallTitle: (eur: S) =>
      `Solar Now, Pay Never: so wurden die heutigen ${eur} aufgeteilt`,
    waterfallNote: (project: S) =>
      `${project} · jeder Verkauf zahlt die Investoren automatisch zurück`,
    waterfall: {
      fee: "Volty-Gebühr",
      reserve: "Wartungsrücklage",
      investor: "Investoren (Rückzahlung)",
      host: "Sie (Dachgeber)",
    },
    repaymentProgress: "Stand der Rückzahlung",
    reached: (n: number) => `Ihr Strom hat heute ${n} Nachbarn erreicht`,
    mapNote: (co2: S) =>
      `Bögen zeigen, wen Sie versorgt haben (breiter = mehr kWh); Säulen zeigen Solarerzeugung und Verbrauch jedes Hauses. Rechtsklick-Ziehen zum Drehen. Andere Häuser erscheinen auf Straßenebene, außer sie haben zugestimmt. Rund ${co2} kg CO₂ gegenüber dem Strommix vermieden.`,
    rules: "Verkaufsregeln",
    minPrice: (community: S) =>
      `Mindestpreis, ct/kWh (Gemeinschaftspreis: ${community} ct)`,
    priority: "Diese Nachbarn zuerst versorgen",
    rulesIntro:
      "Ihr Handelsagent bietet mit diesen Grenzen. Sie können sie auch in eigenen Worten auf der KI-Agent-Seite festlegen.",
    minPriceLabel: "Niedrigster Verkaufspreis",
    minPriceHint: (community: S, feedIn: S) =>
      `Der Gemeinschaftspreis ist ${community} ct. Unter ${feedIn} ct brächte die Einspeisevergütung mehr.`,
    reserveLabel: "Für den Abend im Speicher behalten",
    priorityHint:
      "Sie bekommen Ihren Überschuss vor allen anderen, zum gleichen Preis.",
    paidOutToday: "Heute ausgezahlt",
    hourCol: "Stunde",
    reserve: "Batteriereserve für den Abend, kWh",
    reserveHint: (cap: S) =>
      `Die Batterie lädt bis zu diesem Stand; Überschuss darüber wird an Nachbarn verkauft. ${cap} behält das bisherige Verhalten bei (erst voll laden).`,
  },
  buyer: {
    title: "Bezieher-Dashboard",
    empty: {
      before: "Für diesen Arbeitsbereich gibt es noch keine Zählerdaten.",
      link: "Registrieren Sie Ihren Standort",
      after:
        "und nach den nächsten simulierten Intervallen sehen Sie hier, woher Ihr Strom kam.",
    },
    choose: "Bezieher wählen",
    communityPrice: (ct: S) => `Gemeinschaftspreis ${ct} ct/kWh`,
    tiles: {
      localShare: "Lokaler Anteil heute",
      fromNeighbours: (kwh: S) => `${kwh} von Nachbarn`,
      fromUtility: "Heute vom Versorger",
      fromUtilitySub: "Deckt alles ab, was nicht geteilt wird",
      saved: (month: S) => `Gespart im ${month}`,
      savedSub: (grid: S) => `gegenüber ${grid} ct Netzstrompreis`,
      bill: (month: S) => `In Ihrer Abrechnung ${month}`,
      billSub: "Für Strom von Nachbarn",
    },
    chartTitle: (share: S, top: S) =>
      `${share} Ihres Stroms kam heute von Nachbarn, das meiste von ${top}`,
    chartTitleNone: "Heute noch kein Strom von Nachbarn",
    chartNote: "Woher jede Viertelstunde Ihres Stroms kam, kWh",
    suppliers: (month: S) => `Ihre Lieferanten im ${month}`,
    noneYet: "Noch keine.",
    table: {
      supplier: "Lieferant",
      kwhToday: "kWh heute",
      eurToday: "€ heute",
      kwh: "kWh Monat",
      share: "Anteil",
      amount: "€ Monat",
    },
    shareNote: "Anteil = Teil Ihres gesamten Stromverbrauchs in diesem Monat.",
    payments: "Zahlungen",
    paymentsNote:
      "Das Stadtwerk bezahlt Ihre Nachbarn stündlich auf Solana und stellt Ihnen den Betrag in der Monatsabrechnung in Rechnung.",
    nothingToPay: "Noch nichts zu bezahlen.",
    paymentsNoteP2p:
      "Peer-to-Peer: Sie bezahlen Ihre Nachbarn jede Stunde direkt aus Ihrer Wallet, im Rahmen des unten freigegebenen Limits.",
    paid: (eur: S) => `${eur} bezahlt`,
    pending: (eur: S) => ` · ${eur} offen`,
    payment: (n: number) => `Zahlung ${n}`,
    paidThisMonth: "Diesen Monat an Nachbarn gezahlt",
    pendingShort: (eur: S) => `${eur} noch offen`,
    payCount: (n: number) => (n === 1 ? "1 Zahlung" : `${n} Zahlungen`),
    next24: "Die nächsten 24 Stunden: geplante Versorgung und Ersatz",
    next24Note:
      "Prognose aus dem Solarmodell. Wenn Wolken die Erzeugung Ihres Hauptlieferanten senken, übernimmt automatisch der Ersatz.",
    next24None:
      "In den nächsten 24 Stunden wird keine Versorgung durch Nachbarn erwartet.",
    scheduleTable: {
      hour: "Stunde",
      utility: "Versorger",
      backup: "Ersatz bei Wolken",
    },
    shifts: "Wie sich Ihre Versorgung heute verschoben hat",
    noShifts: "Bisher heute kein Lieferantenwechsel.",
    shift: (kwh: S, from: S, to: S) =>
      `${kwh} kWh von ${from} zu ${to} verlagert`,
    shiftReason: {
      fell: (name: S) => `Überschuss von ${name} gesunken`,
      rebalanced: "auf mehrere Lieferanten verteilt",
    },
    potential: "Mögliche Lieferanten",
    rankBy: "Lieferanten sortieren nach",
    ranks: {
      score: "Insgesamt am besten",
      reliability: "Am zuverlässigsten",
      distance: "Am nächsten",
      price: "Am günstigsten",
    },
    potentialTable: {
      seller: "Erzeuger",
      price: "Preis",
      distance: "Entfernung",
      available: "Verfügbar",
      steadiness: "Gleichmäßigkeit",
      next24: "Nächste 24 h",
      likely: "Voraussichtlich geliefert",
      status: "Status",
    },
    agentPick: (name: string, kwh: string, distance: string) =>
      `Empfehlung Ihres Agenten: ${name}. Liefert voraussichtlich ${kwh} in den nächsten 24 Stunden, ${distance} entfernt.`,
    agentPickNote:
      "Ausgewählt nach dem prognostizierten Überschuss jedes Erzeugers, gewichtet damit, wie oft er zu diesen Stunden wirklich Überschuss hatte (gelernt aus den letzten 14 Tagen), nach Entfernung und Ihren Regeln.",
    backupPct: (pct: string) => `zu dieser Stunde ${pct} zuverlässig`,
    potentialStatus: {
      blocked: "Von Ihnen gesperrt",
      outside: "Außerhalb Ihrer Regeln",
      preferred: "Bevorzugt",
      available: "Verfügbar",
    },
    potentialNote:
      "Verfügbar: Anteil der Viertelstunden bei Tageslicht mit Überschuss, letzte 30 Tage. Gleichmäßigkeit: wie stetig die Erzeugung ist (100 % = keine Schwankungen). Nächste 24 h: prognostizierter Überschuss. Voraussichtlich geliefert: diese Prognose, Stunde für Stunde gewichtet damit, wie oft der Erzeuger zu dieser Stunde wirklich Überschuss hatte, letzte 14 Tage.",
    mapTitle: "Woher Ihr Strom heute kam",
    mapNote:
      "Bögen zeigen, wer Sie versorgt hat (breiter = mehr kWh); Säulen zeigen Solarerzeugung und Verbrauch jedes Hauses. Rechtsklick-Ziehen zum Drehen. Andere Häuser erscheinen auf Straßenebene, außer sie haben zugestimmt.",
    rules: "Kaufregeln",
    maxPrice: "Höchstpreis, ct/kWh",
    maxDistance: "Höchstentfernung, m",
    prefer: "Bevorzugen",
    never: "Nie kaufen bei",
    rulesNote:
      "Änderungen gelten für alle ab jetzt zugeordneten Intervalle. Den Rest deckt immer Ihr Versorger.",
  },
  sme: {
    title: "KMU-Bereich",
    notBusiness:
      "Dieser Arbeitsbereich ist kein Unternehmen. Legen Sie über das Arbeitsbereich-Menü einen Unternehmensbereich an.",
    businessWorkspace: "Unternehmensbereich",
    noMeter: {
      before: "Noch kein Zähler.",
      link: "Registrieren Sie den Standort Ihres Betriebs",
      after:
        "um lokalen Solarstrom zu beziehen. Die KMU-Prüfung unten können Sie schon jetzt ausfüllen.",
    },
    tiles: {
      anchorToday: "Ankerversorgung heute",
      capUsed: (pct: S, cap: S) =>
        `${pct} der täglichen Höchstmenge von ${cap} kWh`,
      noAnchor: "Keine Ankervereinbarung",
      localShare: (month: S) => `Lokaler Anteil, ${month}`,
      fromNeighbours: (kwh: S) => `${kwh} von Nachbarn`,
      saved: (month: S) => `Gespart im ${month}`,
      savedSub: (grid: S) => `gegenüber ${grid} ct Netzstrompreis`,
      co2: "Vermiedenes CO₂ in diesem Monat",
      co2Sub: "Gegenüber dem Strommix; für Ihre Berichte",
    },
    profileTitle:
      "Ihre verbrauchsstärksten Stunden fallen mit dem Solarüberschuss im Viertel zusammen",
    profileNote:
      "kWh pro Stunde heute. Die Ankervereinbarung kauft den Überschuss in Ihrem Zeitfenster zuerst.",
    eligibility: "Teilnahmeberechtigung am Energy Sharing",
    eligibilityNote: (staff: S) =>
      `§42c EnWG erlaubt nur Haushalte und KMU. EU-Definition für KMU: weniger als ${staff} Beschäftigte und ein Jahresumsatz bis 50 Mio. € oder eine Bilanzsumme bis 43 Mio. €.`,
    eligible: "✓ Als KMU berechtigt",
    status: {
      eligible: (until: S) =>
        `Nimmt am Energy Sharing teil. KMU-Prüfung gültig bis ${until}.`,
      expired:
        "Keine Teilnahme am Energy Sharing: Ihre KMU-Prüfung ist älter als ein Jahr. Bitte bestätigen Sie Ihre Angaben unten erneut.",
      unchecked:
        "Noch keine Teilnahme am Energy Sharing: Bitte füllen Sie unten die KMU-Prüfung aus. Bis dahin versorgt Sie Ihr Versorger wie gewohnt.",
      ineligible:
        "Keine Teilnahme am Energy Sharing: Dieses Unternehmen erfüllt die KMU-Definition nicht. Ein Partnerversorger kann stattdessen lokalen Ökostrom liefern.",
    },
    notEligible: "✗ Nicht berechtigt",
    reasons: {
      staff: (limit: S, entered: S) =>
        `Weniger als ${limit} Beschäftigte erforderlich (Sie haben ${entered} angegeben).`,
      financials:
        "Entweder der Jahresumsatz darf höchstens 50 Mio. € oder die Bilanzsumme höchstens 43 Mio. € betragen.",
    },
    staff: "Beschäftigte (Vollzeitäquivalente)",
    turnover: "Jahresumsatz, €",
    balanceSheet: "Bilanzsumme, €",
    checkAndSave: "Prüfen und speichern",
    checkNote:
      "Wird jährlich neu bestätigt. Größere Unternehmen können lokalen Ökostrom stattdessen über einen Partnerversorger beziehen.",
    anchor: "Ankervereinbarung",
    anchorSummary: (days: S, from: S, to: S, cap: S, price: S) =>
      `${days} ${from}–${to} Uhr, bis zu ${cap} kWh pro Tag zum Festpreis von ${price} ct/kWh. In diesem Zeitfenster werden Sie zuerst versorgt.`,
    weekdays: "Werktags",
    everyDay: "Täglich",
    from: "Von",
    to: "Bis",
    dailyCap: "Tägliche Höchstmenge, kWh",
    price: (lo: S, hi: S) => `Preis, ct/kWh (${lo}–${hi})`,
    weekdaysOnly: "Nur werktags",
    saveAgreement: "Vereinbarung speichern",
    noAnchorYet:
      "Noch keine Ankervereinbarung. Legen Sie eine an, um den Solarüberschuss im Viertel zur Mittagszeit zuerst und zu einem Festpreis zu beziehen.",
    createAgreement: "Vereinbarung anlegen",
    anchorWhileEligible:
      "Die Zuordnung bedient die Vereinbarung, solange Ihre KMU-Prüfung gültig ist.",
    history: (month: S) => `Tägliche Versorgung im ${month}`,
    historyTable: {
      day: "Tag",
      anchor: "Anker kWh",
      capUsed: "Höchstmenge genutzt",
      other: "Andere Nachbarn kWh",
      total: "Insgesamt bezogen",
    },
    ownSolar: "Eigenen Solarstrom verkaufen",
    ownSolarText:
      "Ein KMU kann auch Strom vom eigenen Dach teilen. §42c verlangt, dass der Betrieb der Anlage nicht überwiegend dem Unternehmen dient. Das ist rechtlich noch unklar; Volty markiert solche Fälle zur rechtlichen Prüfung und empfiehlt, die Anlage über eine Energiegenossenschaft zu betreiben.",
  },
  projects: {
    onChain: {
      title: "Auf Solana:",
      state: (repaid: S, owed: S, reserve: S, investors: number) =>
        `Das Roof-Split-Programm hat den Investoren ${repaid} von ${owed} gezahlt, ${reserve} liegen in der Rücklage, aufgeteilt auf ${investors} Investoren nach den auf der Blockchain gespeicherten Bedingungen. Jede Zahlung an diese Anlage läuft darüber.`,
      account: "Konto der Anlage",
      notYet:
        "Auf Solana: Diese Anlage wird bei ihrer ersten Zahlung auf der Blockchain beim Roof-Split-Programm registriert.",
      unreachable: "Solana Devnet ist gerade nicht erreichbar.",
    },
    title: "Solar Now, Pay Never",
    intro:
      "Investoren finanzieren ein Dach; ein fester Anteil jeder verkauften kWh zahlt sie automatisch zurück. Der Dachgeber zahlt nichts im Voraus.",
    host: (name: S) => `Dachgeber: ${name}`,
    stage: "Projektphase",
    states: {
      draft: "Entwurf",
      funding: "In Finanzierung",
      funded: "Finanziert",
      installed: "Installiert",
      repaying: "In Rückzahlung",
      paid_off: "Zurückgezahlt",
      refunded: "Erstattet",
    },
    raised: (raised: S, target: S, pct: S) =>
      `${raised} von ${target} gesammelt (${pct})`,
    logInToInvest: "Zum Investieren anmelden",
    investor: "Investor",
    amount: "Betrag, €",
    invest: "Investieren",
    markInstalled: "Als installiert markieren und Rückzahlung starten",
    markInstalledNote:
      "Die Anlage geht ans Netz; starten Sie den Simulator, um die ersten Verkäufe die Investoren zurückzahlen zu sehen.",
    fullyFunded:
      "Vollständig finanziert. Das Stadtwerk bestätigt die Installation.",
    deadline: (date: S, days: number) =>
      `Die Finanzierung endet am ${date} (noch ${days} ${days === 1 ? "Tag" : "Tage"}). Wird das Ziel bis dahin nicht erreicht, erhalten alle Investoren ihr Geld zurück.`,
    refundedNote:
      "Das Finanzierungsziel wurde bis zur Frist nicht erreicht. Die Runde wurde abgesagt und alle Investoren haben ihr Geld zurückerhalten.",
    refundedTag: "erstattet",
    fundingDays: "Finanzierungsrunde, Tage",
    escrowNote:
      "In der Demo werden Gelder off-chain erfasst. Im Betrieb liegen sie in einem On-chain-Treuhandkonto einer Partner-Energiegenossenschaft; wird die Finanzierungsfrist verpasst, erhalten alle Investoren ihr Geld zurück.",
    tiles: {
      repaid: "An Investoren zurückgezahlt",
      repaidSub: (owed: S, pct: S) => `von ${owed} geschuldet (${pct})`,
      reserve: "Rücklage",
      reserveSub: (target: S) => `Ziel ${target}`,
      payoff: "Voraussichtliche Rückzahlung",
      payoffValue: (years: S) => `~${years} Jahre`,
      payoffNone: "Noch zu wenig Daten",
      payoffSub: (eur: S) => `${eur} pro Jahr an Investoren`,
      system: "Anlage",
      systemSub: (eur: S) => `${eur} Installationskosten`,
    },
    payoffNote: (share: S, price: S, grid: S, feedIn: S) =>
      `Schätzung: ein Jahr mit etwa 930 kWh pro kWp, davon ${share} an Nachbarn verkauft zu durchschnittlich ${price} ct und ${grid} zur Einspeisevergütung von ${feedIn} ct ins Netz eingespeist, wie bisher bei dieser Anlage. Herbstdaten unterschätzen ein ganzes Jahr.`,
    investors: "Investoren",
    noInvestors: "Noch keine Investoren.",
    investorTable: {
      investor: "Investor",
      invested: "Investiert",
      repaid: "Zurückgezahlt",
      owed: "Insgesamt geschuldet",
    },
    latestRepayments: "Letzte Rückzahlungen auf Solana",
    repaidLatest: (n: number) =>
      `Zurückgezahlt in den letzten ${n} ${n === 1 ? "Stunde" : "Stunden"}`,
    noneYet: "Noch keine.",
    toInvestors: (eur: S) => `${eur} an Investoren`,
    waterfall: (fee: S, reserve: S, target: S, investors: S, owed: S, ret: S) =>
      `Aufteilung jedes Verkaufs: ${fee} % Volty-Gebühr · ${reserve} % in die Rücklage, bis sie ${target} enthält · ${investors} % an die Investoren, bis ${owed} zurückgezahlt sind (Kapital plus ${ret} %) · der Rest an den Dachgeber.`,
    haveRoof: {
      before: "Sie haben ein Dach ohne Solaranlage?",
      link: "Melden Sie sich an",
      after: "und lassen Sie es von Investoren finanzieren.",
    },
    start: "Neues Projekt starten",
    roofHost: "Dachgeber",
    projectName: "Projektname",
    defaultName: "Solaranlage auf dem Dach",
    size: "Anlagengröße, kWp",
    cost: "Installationskosten, €",
    startFunding: "Finanzierung starten",
  },
  admin: {
    exportCols: {
      day: "Tag",
      exchanges: "Lieferungen",
      kwh: "kWh geteilt",
      file: "Datei",
    },
    download: "CSV",
    anchorWindow: "Zeitfenster",
    anchorMax: "Bis zu",
    anchorPrice: "Preis",
    olderHours: (n: number) => `${n} ältere Stunden zeigen`,
    batchKpis: {
      hours: "Gezeigte Stunden",
      onChain: "Auf Solana bezahlt",
      simulated: "Simuliert",
      failed: "Fehlgeschlagen",
      paid: "Ausgezahlt",
    },
    verifyShort: "Prüfen",
    txCount: (n: number) => (n === 1 ? "1 Tx" : `${n} Tx`),
    title: "Stadtwerk-Verwaltung",
    staffOnly: "Nur Mitarbeitende des Stadtwerks können diese Seite öffnen.",
    noCommunity: "Noch keine Gemeinschaft. Führen Sie zuerst npm run seed aus.",
    subtitle: (grid: S, n: number) =>
      `Stadtwerk-Verwaltung · Netzgebiet ${grid} · ${n} Mitglieder`,
    tiles: {
      shared: "Zwischen Nachbarn geteilt",
      sharedSub: "Alle simulierten Tage",
      paid: "Auf Solana ausgezahlt",
      paidSub: (n: number) => `${n} bestätigte Läufe auf Devnet`,
      fees: "Volty-Gebühren",
      feesSub: "Aus Verkäufen von Solar Now, Pay Never",
      treasury: "Kassenstand",
      unavailable: "Nicht verfügbar",
      live: "Live von Solana Devnet",
      setup: "npm run setup:devnet ausführen",
    },
    price: "Gemeinschaftspreis",
    priceNote: (feedIn: S, grid: S) =>
      `Festpreismodus: Alle Nachbarn zahlen und erhalten diesen Preis. Er muss zwischen der Einspeisevergütung von ${feedIn} ct und dem Netzstrompreis von ${grid} ct liegen, damit beide Seiten besser fahren.`,
    priceApplies: "Gilt für alle ab jetzt zugeordneten Intervalle.",
    exports: "Exporte für Netzbetreiber und Abrechnung",
    exportsNote: "Endgültige Viertelstunden-Zuordnungen eines Tages als CSV.",
    allocations: (day: S) => `Zuordnungen ${day}`,
    anchors: "Ankervereinbarungen",
    anchorLine: (name: S, days: S, from: S, to: S, cap: S, price: S) =>
      `${name}: ${days} ${from}–${to} Uhr, bis zu ${cap} kWh zu ${price} ct`,
    weekdays: "werktags",
    daily: "täglich",
    members: "Mitglieder",
    memberTable: {
      member: "Mitglied",
      type: "Art",
      solar: "Solar",
      battery: "Batterie",
      use: "Jahresverbrauch",
      wallet: "Wallet",
    },
    unverified: " (nicht geprüft)",
    registrations: "Standort-Registrierungen",
    registrationsNote: (grid: S) =>
      `Jeder Versuch, einen Zähler zu registrieren, mit der Antwort des Netzbetreibers. Zähler außerhalb des Netzgebiets ${grid} werden abgelehnt.`,
    noRegistrations:
      "Noch keine Registrierungen. Die Demo-Häuser wurden beim Seed angelegt.",
    regTable: {
      when: "Wann",
      workspace: "Arbeitsbereich",
      address: "Adresse",
      meter: "Zähler",
      grid: "Netzgebiet",
      result: "Ergebnis",
    },
    batches: "Auszahlungsläufe",
    marketSettings: "Markt und Zahlungen",
    priceMode: "Preis",
    fixedPrice: "Fester Gemeinschaftspreis",
    auctionPrice: "Viertelstunden-Auktion (Energiehandel)",
    settlementMode: "Zahlungen",
    supplierPays:
      "Das Stadtwerk bezahlt Erzeuger und berechnet Bezieher (Deutschland, §42c)",
    p2pPays:
      "Nachbarn bezahlen sich direkt aus ihren Wallets (Österreich, Peer-to-Peer)",
    marketNote:
      "Gilt ab dem nächsten Intervall und der nächsten stündlichen Abrechnung.",
    settlementKey:
      "Abrechnungsschlüssel von Volty (Bezieher geben ihn als Zahlungsberechtigten frei)",
    batchMode: { supplier: "Stadtwerk", p2p: "Peer-to-Peer" },
    batchesNote:
      "Ein Lauf pro Stunde. Das Memo jeder Transaktion enthält die Lauf-ID und einen Hash der Zuordnungen dieser Stunde, sodass jeder eine Zahlung mit der Zuordnung abgleichen kann.",
    batchTable: {
      hour: "Stunde",
      status: "Status",
      recipients: "Empfänger",
      paid: "Ausgezahlt",
      hash: "Zuordnungs-Hash",
      txs: "Transaktionen",
    },
  },
  auth: {
    loginTitle: "Bei Volty anmelden",
    loginIntro:
      "Mit Ihrer E-Mail-Adresse (wir senden Ihnen einen Einmalcode) oder einem Passkey. Neu hier?",
    createAccount: "Konto erstellen",
    loginButton: "Mit E-Mail oder Passkey anmelden",
    signupTitle: "Ihr Volty-Konto erstellen",
    signupIntro:
      "Registrieren Sie sich mit Ihrer E-Mail-Adresse (wir senden Ihnen einen Einmalcode) oder einem Passkey. Es gibt kein Passwort und keine Seed-Phrase: Eine Solana-Wallet wird für Sie angelegt. Danach wählen Sie einen Arbeitsbereich für Ihren Haushalt oder Ihr Unternehmen. Sie haben schon ein Konto?",
    signupButton: "Mit E-Mail oder Passkey registrieren",
    settingUp: "Ihr Konto wird eingerichtet…",
    demoAccounts: "Demo-Konten",
    demoAccountsNote:
      "Nur für die Hackathon-Demo (DEMO_LOGIN=true). Im Betrieb abgeschaltet.",
    noWorkspaceYet: "Noch kein Arbeitsbereich",
    demoSignup: "Demo-Registrierung",
    demoSignupNote:
      "Nur mit DEMO_LOGIN=true: legt ein lokales Konto mit einer erfundenen @kiezwatt.example-Adresse und einer vom Server verwalteten Devnet-Wallet an.",
    yourName: "Ihr Name",
    createDemo: "Demo-Konto erstellen",
    notConfigured:
      "Keine Anmeldemethode eingerichtet. Setzen Sie NEXT_PUBLIC_PRIVY_APP_ID und PRIVY_VERIFICATION_KEY oder für eine lokale Demo DEMO_LOGIN=true in .env.local.",
    errors: {
      not_configured: "Die Anmeldung über Privy ist nicht eingerichtet.",
      missing_token: "Anmeldetoken fehlt.",
      invalid_token:
        "Ungültige oder abgelaufene Anmeldung. Bitte melden Sie sich erneut an.",
      email_taken:
        "Diese E-Mail-Adresse gehört zu einem Konto mit einer anderen Anmeldung.",
      failed: "Anmeldung fehlgeschlagen.",
    },
  },
  workspaces: {
    firstTitle: "Ihren ersten Arbeitsbereich anlegen",
    newTitle: "Neuer Arbeitsbereich",
    intro:
      "Ein Arbeitsbereich ist ein Haushalt oder ein Unternehmen. Jeder hat eigene Wallet, Guthaben und Abrechnungen; Sie wechseln über das Arbeitsbereich-Menü.",
    limit: (n: number) =>
      `Eine Anmeldung kann bis zu ${n} Arbeitsbereiche haben.`,
    loginAgain:
      "Melden Sie sich erneut über Privy an, um einen Arbeitsbereich anzulegen.",
    type: "Art des Arbeitsbereichs",
    kinds: [
      {
        id: "household",
        title: "Haushalt",
        text: "Ihr Zuhause: Solarstrom an Nachbarn verkaufen oder deren Strom beziehen.",
      },
      {
        id: "sme",
        title: "Unternehmen",
        text: "Ein kleines Unternehmen: lokalen Solarstrom während der Öffnungszeiten beziehen, mit KMU-Prüfung.",
      },
    ],
    name: "Name",
    namePlaceholder: "z. B. Haushalt Müller oder Bäckerei Müller",
    creating: "Arbeitsbereich und Wallet werden angelegt…",
    create: "Arbeitsbereich anlegen",
    confirm:
      "Bestätigen Sie, dass Sie es sind, um eine Wallet für den neuen Arbeitsbereich anzulegen.",
    confirmButton: "Mit E-Mail oder Passkey bestätigen",
    errors: {
      choose_kind: "Wählen Sie Haushalt oder Unternehmen.",
      not_configured: "Die Anmeldung über Privy ist nicht eingerichtet.",
      wallet_needed: "Für den neuen Arbeitsbereich wird eine Wallet benötigt.",
      login_expired:
        "Ihre Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.",
      other_login: "Diese Anmeldung gehört jemand anderem.",
      waiting_wallet: "Warten auf die neue Wallet…",
      wallet_timeout:
        "Die neue Wallet ist nicht rechtzeitig erschienen. Bitte versuchen Sie es erneut.",
      name_length:
        "Geben Sie dem Arbeitsbereich einen Namen mit 2 bis 60 Zeichen.",
      too_many: "Sie haben die Höchstzahl an Arbeitsbereichen erreicht.",
      wallet_not_yours:
        "Diese Wallet gehört noch nicht zu Ihrer Anmeldung. Versuchen Sie es gleich noch einmal.",
      wallet_in_use:
        "Diese Wallet gehört bereits zu einem anderen Arbeitsbereich.",
      failed: "Der Arbeitsbereich konnte nicht angelegt werden.",
    },
  },
  account: {
    title: "Ihr Konto",
    passkeyLogin: "Anmeldung per Passkey",
    demo: "Demo-Konto",
    privy: "angemeldet über Privy",
    since: (date: S) => `seit ${date}`,
    workspaces: "Arbeitsbereiche",
    newWorkspace: "Neuer Arbeitsbereich",
    separate:
      "Jeder Arbeitsbereich hat eigene Wallet, Guthaben und Abrechnungen. Nichts wird zwischen ihnen geteilt.",
    noWorkspace: "Noch kein Arbeitsbereich.",
    createOne: "Jetzt anlegen",
    table: { name: "Name", type: "Art", wallet: "Auszahlungs-Wallet" },
    noWallet: "Noch keine",
    openNow: "Geöffnet",
    siteNote: {
      before:
        "Neue Arbeitsbereiche haben noch keinen Zähler: Öffnen Sie den Arbeitsbereich und",
      link: "registrieren Sie seinen Standort",
      after:
        "(Adresse, Zähler-ID, Solar, Batterie, Wallbox). Unternehmensbereiche durchlaufen außerdem die KMU-Prüfung auf der KMU-Seite.",
    },
    delete: "Konto löschen",
    deleteText: (n: number) =>
      `Löscht Ihre Anmeldung, schließt alle ${n} Arbeitsbereiche und entfernt Ihren Namen, Ihre Regeln und Unternehmensangaben. Abgerechnete Zahlungen, Zählerdaten und Zuordnungen bleiben anonymisiert erhalten, weil Abrechnungsunterlagen bis zu 10 Jahre aufbewahrt werden müssen.`,
    deletePrivyWallets:
      " Ihre Privy-Wallets werden ebenfalls gelöscht: Übertragen Sie vorher eventuelles tEURC-Guthaben.",
    blockers: {
      pending:
        "Ein Teil der Energie ist noch nicht abgerechnet. Versuchen Sie es nach der nächsten stündlichen Auszahlung erneut.",
      hosted_project:
        "Ein Dach von Solar Now, Pay Never, dessen Dachgeber Sie sind, ist noch in Finanzierung oder Rückzahlung.",
      open_investments:
        "Sie haben Investitionen, die noch nicht zurückgezahlt sind.",
      last_admin:
        "Dies ist die letzte Anmeldung von Stadtwerk-Mitarbeitenden. Fügen Sie zuerst eine weitere Person hinzu.",
    },
    typeDelete: "Zur Bestätigung LÖSCHEN eingeben",
    wrongConfirm: "Geben Sie zur Bestätigung LÖSCHEN in Großbuchstaben ein.",
    confirmWord: "LÖSCHEN",
    deleteButton: "Mein Konto löschen",
    verifiedNote:
      "Sie haben Ihre Identität bestätigt. Dieser Schritt bleibt 5 Minuten offen.",
    step1: "Schritt 1: Bestätigen Sie, dass Sie es sind",
    expired:
      "Ihre Bestätigung ist nach 5 Minuten abgelaufen. Bitte bestätigen Sie erneut.",
    sendCode: "Code senden",
    sendNewCode: "Neuen Code senden",
    codeSent: "Demo: Der Code steht im Terminal, in dem die App läuft.",
    wrongCode: "Falscher oder abgelaufener Code.",
    code: "6-stelliger Code",
    verify: "Bestätigen",
    privyNotConfigured:
      "Die Anmeldung über Privy ist auf diesem Server nicht eingerichtet.",
    verifyPrivy: "Identität bestätigen (erneut anmelden)",
    waitingLogin: "Warten auf Ihre Anmeldung…",
    verifyErrors: {
      no_privy: "Dieses Konto hat keine Anmeldung über Privy.",
      other_user:
        "Sie haben sich als jemand anderes angemeldet. Nutzen Sie die E-Mail-Adresse oder den Passkey dieses Kontos.",
      too_old: "Bitte melden Sie sich erneut an; diese Anmeldung ist zu alt.",
      invalid: "Diese Anmeldung konnte nicht bestätigt werden.",
      no_token: "Kein Anmeldetoken.",
    },
  },
  site: {
    title: "Ihr Standort",
    intro: (name: S, grid: S) =>
      `${name} · der Zähler, über den dieser Arbeitsbereich kauft und verkauft. Er muss im Netzgebiet der Gemeinschaft liegen (${grid}).`,
    approved:
      "Bestätigt: Der Netzbetreiber hat bestätigt, dass Ihr Zähler im Netzgebiet der Gemeinschaft liegt. Er nimmt ab dem nächsten Viertelstunden-Intervall an der Zuordnung teil.",
    rejected: "Abgelehnt. Den Grund finden Sie in der Liste unten.",
    noSite: "Nur Haushalte und Unternehmen haben einen Standort.",
    fields: {
      meter: "Zähler (MaLo-ID)",
      grid: "Netzgebiet",
      use: "Jahresverbrauch",
      solar: "Solar",
      battery: "Batterie",
      ev: "Wallbox",
    },
    notRecorded: "Nicht erfasst",
    contact:
      "Um Adresse oder Zähler zu ändern, wenden Sie sich an das Stadtwerk.",
    exactLocation: "Meinen genauen Standort auf den Karten der Nachbarn zeigen",
    exactLocationNote:
      "Standardmäßig aus: Nachbarn sehen Ihr Haus nur auf Straßenebene.",
    register: "Standort registrieren",
    demoMeters: "Demo-Netzbetreiber: Zähler zum Ausprobieren",
    demoMetersNote:
      "Die Demo hat keinen echten Netzbetreiber und kennt nur diese Zähler. Die Koblenzer liegen in einem anderen Netzgebiet und werden abgelehnt.",
    history: "Bisherige Registrierungen",
    status: {
      pending: "Wartet auf den Netzbetreiber",
      approved: "Bestätigt",
      rejected: "Abgelehnt",
    },
    meter: "Zähler",
    form: {
      address: "Adresse",
      street: "Straße und Hausnummer",
      postcode: "PLZ",
      city: "Ort",
      meterId: "Zähler: Marktlokations-ID (MaLo-ID)",
      meterHint:
        "11 Ziffern, auf Ihrer Stromrechnung. Der Netzbetreiber bestätigt damit Ihr Netzgebiet.",
      assets: "Was es an dieser Adresse gibt",
      pv: "Solar, kWp",
      battery: "Batterie, kWh",
      ev: "Wallbox, kW",
      evHint: "z. B. 11; 0 wenn keine",
      use: "Jahresverbrauch, kWh",
      useHint: "Aus Ihrer letzten Rechnung",
      zeroIfNone: "0 wenn keine",
      checking: "Wird beim Netzbetreiber geprüft…",
      submit: "Standort registrieren",
    },
    errors: {
      street: "Geben Sie Straße und Hausnummer ein.",
      postcode: "Geben Sie eine 5-stellige deutsche Postleitzahl ein.",
      city: "Geben Sie den Ort ein.",
      meter_format:
        "Das ist keine gültige Marktlokations-ID: 11 Ziffern, wie auf Ihrer Stromrechnung.",
      pv: "Die Solarleistung muss zwischen 0 und 100 kWp liegen.",
      battery: "Die Batteriegröße muss zwischen 0 und 100 kWh liegen.",
      ev: "Die Wallbox-Leistung muss zwischen 0 und 22 kW liegen.",
      use: "Der Jahresverbrauch muss zwischen 500 und 500.000 kWh liegen.",
      wrong_kind: "Nur Haushalte und Unternehmen haben einen Standort.",
      has_site: "Dieser Arbeitsbereich hat bereits einen Standort.",
      meter_taken:
        "Dieser Zähler ist bereits für einen anderen Arbeitsbereich registriert.",
      failed: "Registrierung fehlgeschlagen.",
    },
    reasons: {
      unknown_meter: () =>
        "Der Netzbetreiber kennt diese Zähler-ID nicht. Bitte prüfen Sie sie anhand Ihrer Stromrechnung.",
      postcode_mismatch: (p: { postcode?: S; city?: S }) =>
        `Diese Zähler-ID gehört zu einer Adresse in ${p.postcode} ${p.city}, nicht zur angegebenen Postleitzahl.`,
      outside_grid_area: (p: { gridAreaId?: S; communityGridAreaId?: S }) =>
        `Dieser Zähler liegt im Netzgebiet ${p.gridAreaId}, außerhalb des Netzgebiets der Gemeinschaft (${p.communityGridAreaId}). Energy Sharing nach §42c EnWG funktioniert nur innerhalb eines Netzgebiets.`,
    },
  },
  statements: {
    title: "Abrechnungen",
    intro:
      "Eine Abrechnung pro Arbeitsbereich und Monat: gekaufte und verkaufte Energie, Preise, Gebühren, Umsatzsteuer und jede Zahlung auf Solana.",
    none: "Noch keine Abrechnungen: Sie erscheinen, sobald dieser Arbeitsbereich Energie gekauft oder verkauft hat.",
    month: "Monat",
    download: "PDF herunterladen",
    heading: (month: S) => `Abrechnung ${month}`,
    docTitle: "Monatsabrechnung",
    number: "Abrechnungsnr.",
    period: "Zeitraum",
    issued: "Erstellt am",
    meter: "Zähler (MaLo-ID)",
    address: "Adresse",
    workspace: "Arbeitsbereich",
    issuer: "Stadtwerk Vallendar (Demo) · Energy Sharing nach §42c EnWG",
    summary: "Übersicht",
    paidOut: "An Sie auf Solana ausgezahlt",
    toBill: "Mit Ihrer Stromrechnung berechnet",
    paidFromWallet: "Aus Ihrer Wallet an Nachbarn bezahlt",
    outgoing: "an Nachbarn",
    unsettled: "Noch nicht abgerechnet (nächste stündliche Auszahlung)",
    nettingNote:
      "Wenn das Stadtwerk zahlt, werden Käufe und Verkäufe derselben Stunde verrechnet: Pro Stunde erhalten Sie entweder eine Auszahlung auf Solana oder schulden die Differenz. In Peer-to-Peer-Stunden bezahlen Sie Nachbarn aus Ihrer Wallet und werden getrennt von ihnen bezahlt.",
    bought: "Von Nachbarn gekaufte Energie",
    sold: "Verkaufte Energie",
    table: {
      price: "Preis",
      kwh: "kWh",
      amount: "Betrag",
      description: "Beschreibung",
    },
    atPrice: (ct: S) => `zu ${ct}/kWh`,
    fedIn: (ct: S) => `ins Netz eingespeist, Einspeisevergütung ${ct}/kWh`,
    subtotal: "Summe",
    vatIncluded: (rate: S, eur: S) => `inkl. ${rate} USt.: ${eur}`,
    net: "Netto",
    vat: "USt.",
    noVatSmall: "Keine Umsatzsteuer: privater Kleinunternehmer (§19 UStG)",
    noneBought: "In diesem Monat keine Energie von Nachbarn gekauft.",
    noneSold: "In diesem Monat keine Energie verkauft.",
    waterfall: "Solar Now, Pay Never: Abzüge von Ihren Verkäufen",
    fee: "Volty-Gebühr",
    reserve: "Wartungsrücklage für Ihr Dach",
    investors: "Rückzahlung an die Investoren Ihres Dachs",
    toYou: "Ihnen gutgeschrieben",
    repayments: "Rückzahlungen aus Dächern von Solar Now, Pay Never",
    repaymentsNote:
      "Darlehensrückzahlungen: nicht umsatzsteuerpflichtig (§4 Nr. 8 UStG).",
    roof: (name: S) => `Dach: ${name}`,
    usage: "Ihr Zähler in diesem Monat",
    usageRows: {
      load: "Verbraucht",
      fromNeighbours: "davon von Nachbarn",
      fromGrid: "Aus dem Netz (wie gewohnt von Ihrem Versorger abgerechnet)",
      generated: "Solar erzeugt",
      exported: "Eingespeist",
    },
    payments: "Zahlungen auf Solana",
    paymentsNote:
      "Jede Auszahlung ist eine Überweisung in EURC (tEURC auf Devnet) aus der Kasse des Stadtwerks. Die Links öffnen die Transaktion im Solana Explorer.",
    noPayments: "In diesem Monat keine Auszahlungen.",
    paymentTable: {
      hour: "Stunde",
      amount: "Betrag",
      status: "Status",
      tx: "Transaktion",
    },
    disclaimer:
      "Demo-Abrechnung aus simulierten Zählerdaten auf Solana Devnet. Keine Rechnung im steuerlichen Sinne.",
    page: (n: number, total: number) => `Seite ${n} von ${total}`,
  },
  map3d: {
    region: {
      title: "Die Region: benachbarte Energiegemeinschaften",
      tabs: "Kartenansicht",
      tabNeighbourhood: "Viertel",
      tabRegion: "Region",
      intro: (date: S) =>
        `${date}: was jeder Gemeinschaft nach dem Teilen ihrer Mitglieder blieb, Stunde für Stunde, und der Austausch mit unserer. Klicken Sie auf Tag abspielen.`,
      you: "Ihre Gemeinschaft",
      allowed: "erlaubt",
      blocked: {
        from_2028: "erlaubt ab 1. Juni 2028",
        not_sharing: "kein Energy Sharing",
      } as Record<S, S>,
      level: {
        same_substation: "gleiches Umspannwerk",
        same_area: "gleiches Netzgebiet",
        adjacent_area: "angrenzendes Netzgebiet",
        remote: "weit entfernt (normale Belieferung)",
      } as Record<S, S>,
      kind: {
        trade: "bezahlter Austausch",
        credit: "geliehener / verliehener Strom",
        repay: "in Strom zurückgegeben",
        credit_settled: "Kredit in Geld bezahlt",
      } as Record<S, S>,
      legendSurplus: "Übriger Überschuss",
      legendShort: "Fehlender Strom",
      summary: (inKwh: S, outKwh: S) =>
        `von Nachbarn ${inKwh} · an Nachbarn ${outKwh}`,
      surplus: (kwh: S) => `Überschuss übrig: ${kwh}`,
      short: (kwh: S) => `Es fehlen: ${kwh}`,
      tipFlow: (from: S, to: S, kwh: S, kind: S) =>
        `${from} → ${to}\n${kwh} · ${kind}`,
      near: "In der Nähe",
      all: "Alle, auch weit entfernte",
      off: "Der Verbund ist ausgeschaltet: Das Stadtwerk schaltet ihn auf der Verbund-Seite ein (die Live-Demo tut das).",
      note: "Netzgebiete sind beispielhaft als Rechtecke gezeichnet. Höhr-Grenzhausen ist in Kilometern näher als Hillscheid, liegt aber im nächsten Netzgebiet: Entscheidend ist die Lage im Netz, nicht die Entfernung.",
      honesty:
        "Die benachbarten Gemeinschaften sind simuliert, ihre Netzgebiete beispielhaft.",
      toFederation: "Details und Abrechnungen auf der Verbund-Seite →",
      noPeers:
        "Noch keine benachbarten Gemeinschaften: Schalten Sie den Verbund ein (Verbund-Seite oder Live-Demo).",
    },
    title: "Das Viertel in 3D",
    intro: (day: S) =>
      `Simulierter Tag ${day}. Säulen zeigen Solarerzeugung und Verbrauch jedes Hauses in der gewählten Stunde; Bögen zeigen, wer wen versorgt hat. Echte Stromleitungen und Trafos stammen aus OpenStreetMap.`,
    rotateHint:
      "Ziehen zum Verschieben · Rechtsklick-Ziehen oder Strg+Ziehen zum Drehen und Neigen · Scrollen zum Zoomen",
    hour: "Stunde",
    wholeDay: "Ganzer Tag",
    openFull: "Große Karte öffnen",
    legendTitle: "Ebenen und Legende",
    play: "Tag abspielen",
    pause: "Pause",
    resetView: "Ansicht zurücksetzen",
    layers: "Anzeigen",
    layer: {
      buildings: "3D-Gebäude",
      grid: "Stromnetz",
      flows: "Energieflüsse",
      columns: "Solar und Verbrauch",
      area: "Netzgebiet",
    },
    legend: {
      solar: "Solar erzeugt (Höhe = kWh)",
      use: "Strom verbraucht (Höhe = kWh)",
      flow: "An Nachbarn geteilt (Breite = kWh)",
      line380: "380-kV-Höchstspannungsleitung",
      line110: "110-kV-Leitung",
      minor: "Lokale Leitung",
      transformer: "Transformator",
      substation: "Umspannwerk",
      area: (id: S) => `Netzgebiet ${id} (Umriss beispielhaft)`,
    },
    lvNote:
      "Niederspannungskabel in den Straßen liegen meist unterirdisch und fehlen in OpenStreetMap; die Daten des Netzbetreibers würden sie ergänzen.",
    streetLevel: "auf Straßenebene dargestellt",
    you: "Ihr Haus",
    tipSite: (name: S, solar: S, use: S) =>
      `${name}\nSolar: ${solar}\nVerbrauch: ${use}`,
    tipFlow: (from: S, to: S, kwh: S) => `${from} → ${to}\n${kwh}`,
    tipLine: (kind: S) => kind,
    noData: "Noch keine simulierten Daten. Starten Sie zuerst den Simulator.",
    attribution: "Karte © OpenFreeMap, OpenMapTiles, OpenStreetMap-Mitwirkende",
  },
  demo: {
    live: {
      boundary: {
        substation: "gleiches Umspannwerk",
        area: "gleiches Netzgebiet (erlaubt)",
        adjacent: "angrenzendes Netzgebiet (ab 2028)",
      },
      title: "Live: Strom zwischen den Gemeinschaften",
      intro:
        "Jede simulierte Stunde: was jeder Gemeinschaft nach dem Teilen ihrer Mitglieder bleibt (Balken: orange Überschuss, blau fehlender Strom) und der Strom zwischen unserer und den Nachbarn. Blass mit ✕: darf nicht mit uns teilen, mit Grund. Der Austausch jeder Stunde wird mit dem Rest der Stunde auf Solana bezahlt.",
      ticker: "Letzte Austausche",
      settled: "auf Solana abgerechnet",
    },
    homeTitle: "Live-Demo",
    homeText:
      "Ein Klick schaltet Energiehandel, Peer-to-Peer-Zahlungen und die KI-Handelsagenten ein, lässt den Zahlungsagenten die Demo-Wallets einrichten und simuliert einen sonnigen Tag, bei dem jede Zahlung auf Solana Devnet abgerechnet wird. Danach führt eine Tour durch jede Art von Mitglied.",
    run: "Live-Demo starten",
    againShort: "Demo erneut starten",
    runningShort: "Demo läuft…",
    stoppingShort: "Stoppt nach dieser Stunde…",
    stop: "Stopp",
    stopHint:
      "Beendet die Demo, sobald die laufende Stunde abgerechnet ist, damit keine Zahlung halb erledigt bleibt.",
    reset: "Zurücksetzen",
    resetHint:
      "Beendet die Demo und leert Fortschritt und Live-Ansicht. Simulierte Stunden und Solana-Zahlungen bleiben; der nächste Lauf macht bei der Simulationsuhr weiter.",
    length: "Dauer",
    hours: (n: number) => `${n} ${n === 1 ? "Stunde" : "Stunden"}`,
    guide: "Demo-Leitfaden",
    notAvailable:
      "Die Live-Demo gibt es nur in Demo-Installationen (DEMO_LOGIN=true) oder für Stadtwerk-Mitarbeitende.",
    title: "Live-Demo",
    intro:
      "Starten Sie sie und erklären Sie die Schritte, während sie läuft (2–4 Minuten mit echten Devnet-Zahlungen). Die Tour unten öffnet jede Seite angemeldet als die passende Person.",
    start: "Live-Demo starten",
    again: "Erneut starten (setzt mit dem nächsten Tag fort)",
    steps: {
      settings:
        "Energiehandel (Viertelstunden-Auktion), Peer-to-Peer-Zahlungen und den Verbund mit Nachbargemeinschaften einschalten",
      agents:
        "KI-Handelsagenten einschalten: Annas intelligenter Speicher und intelligentes Laden für Bens Auto (die Demo ergänzt an seinem Standort eine 11-kW-Wallbox)",
      ai: "Die Open-Source-Sprach- und Stimmmodelle auf diesem Server starten (Ollama, Whisper, Piper)",
      wallets:
        "Wallets vorbereiten: Der Zahlungsagent setzt die Limits von Ben und der Bäckerei; Dana bleibt ohne Freigabe",
      simulate:
        "Den Tag simulieren und jede Stunde auf Solana Devnet abrechnen",
    },
    status: {
      waiting: "Wartet",
      running: "Läuft…",
      done: "Fertig",
      skipped: "Übersprungen: Devnet ist nicht eingerichtet",
      failed: "Fehlgeschlagen",
    },
    aiSkipped:
      "Übersprungen: Ollama läuft nicht, deshalb erklärt die Agenten-Seite mit reinen Fakten. Starten mit: ollama serve",
    progress: (done: number, total: number) => `${done} von ${total} Stunden`,
    finished: "Fertig. Folgen Sie der Tour unten.",
    table: {
      hour: "Stunde",
      shared: "Geteilt",
      price: "Marktpreis",
      neighbours: "Nachbarn, kWh rein · raus",
      paid: "Bezahlt",
      tx: "Solana",
    },
    offChain:
      "Devnet ist nicht eingerichtet, daher werden Zahlungen erfasst, aber nicht gesendet. Führen Sie npm run setup:devnet für echte Überweisungen aus.",
    tour: "Geführte Tour",
    tourIntro:
      "Gehen Sie die Schritte der Reihe nach durch (etwa 8 Minuten). Jeder Knopf meldet Sie als diese Person an und öffnet die Seite. Der DE | EN-Schalter oben wechselt jederzeit die Sprache.",
    open: (who: S) => `Als ${who} öffnen`,
    tourSteps: [
      {
        title: "1. Das Stadtwerk schaltet den Handel ein",
        points: [
          "Markt und Zahlungen: Viertelstunden-Auktion und Peer-to-Peer-Zahlungen sind eingeschaltet.",
          "Auszahlungsläufe: Jede Stunde ist als Peer-to-Peer markiert, mit ihren Solana-Transaktionen. Öffnen Sie eine im Explorer: Das Memo nennt die Stunde, die Überweisungen kommen aus den Wallets der Bezieher.",
          "Dana hat kein Limit freigegeben, daher zahlt für ihre Käufe das Stadtwerk; die Erzeuger werden trotzdem bezahlt.",
          "Klicken Sie auf den Hash einer Abrechnung: Das öffentliche Protokoll (ohne Anmeldung) zeigt die Lieferungen der Stunde unter pseudonymen Codes und prüft ihren Hash gegen das Solana-Memo: ✓ Bestätigt.",
        ],
      },
      {
        title: "2. Der Verbund: Handel mit benachbarten Gemeinschaften",
        points: [
          "Zuerst sagen: Unser Viertel kann seinen Solarstrom nicht immer selbst nutzen, und manche Abende fehlt Strom. Benachbarte Energiegemeinschaften haben zu anderen Zeiten das umgekehrte Problem.",
          "Heute mit den Nachbarn (oben auf der Seite): eine Zeile pro Gemeinschaft. Von der Solar-Genossenschaft Hillscheid gekauft (bezahlt), von Mallendar geliehen und später in Strom zurückgegeben, an das Gewerbegebiet Vallendar-Nord verkauft.",
          "Die zwei, die nie genutzt wurden, und warum: Höhr-Grenzhausen liegt im nächsten Netzgebiet (Energy Sharing dort erst ab Juni 2028), und Cochem, 43 km entfernt, wäre normale Belieferung. Zeigen Sie auf die verschachtelten Netzebenen: Das Modell wählt immer die nächste erlaubte Gemeinschaft, und eine Kette A → B → C hilft nicht, weil Strom dem Netz folgt, nicht Verträgen.",
          "Die nächsten 24 Stunden: der empfohlene Partner und der beste Austausch je Stunde, aus den Prognosen.",
          "Bisher ausgetauscht: die Zahlungen zwischen den Kassen der Gemeinschaften, jeweils eine Solana-Transaktion. Dann auf Auf der Karte ansehen klicken.",
        ],
      },
      {
        title: "3. Eine Erzeugerin: Marktpreis und gelernte Prognose",
        points: [
          "Die Kopfzeile zeigt den aktuellen Marktpreis; das Diagramm zeigt, wie er am sonnigen Mittag fällt und bei knappem Strom steigt.",
          "Die Batterieprognose begründet ihre Erwartung und ist aus Annas eigenen Zählerdaten gelernt: Ihr Fehler steht neben dem des festen Solarmodells.",
          "Auszahlungen auf Solana: jede Stunde direkt aus den Wallets der Nachbarn.",
          "Verkaufsregeln: Mit ihrem Mindestpreis und der Abendreserve der Batterie bietet ihr Handelsagent.",
        ],
      },
      {
        title: "4. Der KI-Agent: entscheiden, erklären, zuhören",
        points: [
          "Was Ihr Agent getan hat: Am Freitagabend hat er aus Annas Speicher zum besten verbleibenden Preis verkauft, aber behalten, was ihr Haus bis zum Sonnenaufgang braucht; am Samstagmittag hat er Solarstrom gespeichert, weil der Abend mehr bringt.",
          "In einfachen Worten erklären, dann Anhören: Ein Sprachmodell auf diesem Server erklärt die Entscheidungen, eine Open-Source-Stimme liest sie vor (DE oder EN).",
          "Sagen Sie es Ihrem Agenten, getippt oder gesprochen: z. B. „Nie unter 18 Cent verkaufen.“ Er zeigt die Änderung zuerst; erst mit Übernehmen gilt sie.",
          "Die Entscheidungen selbst kommen aus Prognosen (dem Markt, einen Tag im Voraus gerechnet), nicht vom Sprachmodell.",
        ],
      },
      {
        title: "5. Ein Bezieher: Nachbarn aus der eigenen Wallet bezahlen",
        points: [
          "Nachbarn direkt bezahlen: sein Guthaben, sein freigegebenes Limit und der Vorschlag des Zahlungsagenten, basierend auf seinen üblichen Käufen.",
          "Zahlungen: was er jedem Nachbarn gezahlt hat, mit Solana-Links.",
          "Die nächsten 24 Stunden: geplante Versorgung aus den gelernten Prognosen, mit Ersatz bei Wolken, gewählt danach, wie zuverlässig jeder Erzeuger zu dieser Stunde ist.",
          "Mögliche Lieferanten: die Empfehlung Ihres Agenten, geordnet nach dem, was jeder Erzeuger voraussichtlich liefert.",
          "Widerrufen und neu freigeben Sie live, um zu zeigen, dass er die Kontrolle behält. Danach seine KI-Agenten-Seite: der Ladeplan des Autos und was er gespart hat.",
        ],
      },
      {
        title:
          "6. Ein kleines Unternehmen: KMU-Prüfung, Ankervereinbarung, Abrechnung",
        points: [
          "KMU-Status: nimmt am Energy Sharing teil, Prüfung ein Jahr gültig. Eine fehlgeschlagene oder abgelaufene Prüfung stoppt den Handel.",
          "Die Ankervereinbarung kauft den Mittagsüberschuss zum Festpreis vor der Auktion.",
          "Dann Abrechnungen → PDF herunterladen: Käufe zu Fest- und Marktpreisen, Umsatzsteuer und was aus der Wallet an Nachbarn gezahlt wurde.",
        ],
      },
      {
        title:
          "7. Solar Now, Pay Never: Investoren werden aus jedem Verkauf zurückgezahlt",
        points: [
          "Webers Dach: Stand der Rückzahlung und die letzten Rückzahlungen auf Solana.",
          "In Peer-to-Peer-Stunden werden Investoren direkt aus den Wallets der Bezieher bezahlt, als Teil jedes Kaufs.",
          "„Auf Solana“: Das Konto des Roof-Split-Programms zeigt, was es den Investoren gezahlt hat. Jede Zahlung an die Anlage läuft darüber, niemand kann sie anders auszahlen.",
        ],
      },
      {
        title: "8. Das Viertel in 3D",
        points: [
          "Drücken Sie „Tag abspielen“: Solarsäulen wachsen mittags, Bögen zeigen, wer mit wem gehandelt hat.",
          "Rechtsklick-Ziehen zum Drehen. Das echte Stromnetz stammt aus OpenStreetMap.",
          "Wechseln Sie zu Region: die benachbarten Gemeinschaften, farbig nach Netzebene, mit Säulen für den Rest jeder Gemeinschaft und Bögen für den Austausch mit unserer. „Alle, auch weit entfernte“ zoomt bis Cochem.",
        ],
      },
    ],
  },
  market: {
    title: "Heutiger Marktpreis",
    note: (floor: S, cap: S) =>
      `Ein Preis pro Viertelstunde aus der Auktion im Viertel: niedrig bei viel Sonne, höher, wenn Strom knapp ist. Er liegt nie unter der Einspeisevergütung von ${floor} ct und nie über dem Netzstrompreis von ${cap} ct. Ankervereinbarungen behalten ihren Festpreis.`,
    now: (ct: S) => `Marktpreis jetzt ${ct}`,
    average: (ct: S) => `Tagesdurchschnitt ${ct}`,
    price: "Preis, ct/kWh",
    traded: "gehandelt",
    noTrades: "Heute noch keine Handelsgeschäfte.",
    tooltipPrice: (ct: S) => `${ct} pro kWh`,
  },
  wallet: {
    ownWallet: {
      approve: "Mit meiner Wallet freigeben",
      revoke: "Mit meiner Wallet widerrufen",
      signing: "Wird in Ihrer Wallet signiert…",
      approved:
        "Freigegeben: Ihre Wallet hat das Limit signiert. Volty kann Ihre Nachbarn jetzt daraus bezahlen, nie mehr als das.",
      revoked: "Widerrufen: Volty kann nicht mehr aus Ihrer Wallet zahlen.",
      note: "Sie signieren das in Ihrer eigenen Wallet (Privy). Volty zahlt nur die Netzwerkgebühr und hat Ihren Schlüssel nie.",
      notConnected:
        "Melden Sie sich in diesem Browser mit Privy an, um mit Ihrer Wallet zu signieren.",
    },
    title: "Nachbarn direkt bezahlen",
    intro:
      "Peer-to-Peer-Modus: Jede Stunde bezahlen Sie die Nachbarn, bei denen Sie gekauft haben, direkt aus Ihrer Wallet, im Rahmen eines Monatslimits, das Sie freigeben. Der Abrechnungsschlüssel von Volty kann nicht mehr abbuchen, und Sie können die Freigabe jederzeit widerrufen. Reichen Limit oder Guthaben nicht, übernimmt das Stadtwerk die Stunde und stellt sie Ihnen wie gewohnt in Rechnung.",
    balance: "Wallet-Guthaben",
    approved: "Für Volty freigegeben",
    notApproved: "Nicht freigegeben",
    topUp: "25 tEURC aufladen",
    limit: "Monatslimit, €",
    approve: "Limit freigeben",
    revoke: "Widerrufen",
    demoNote:
      "Demo-Wallet: Der Server signiert für Sie. Mit Ihrer eigenen Wallet würden Sie das in der Wallet-App freigeben.",
    realWallet:
      "Die Privy-Anmeldung ist auf diesem Server nicht eingerichtet, daher können Sie hier nicht mit Ihrer eigenen Wallet signieren; bis dahin übernimmt das Stadtwerk Ihre Käufe.",
    unavailable: "Solana Devnet ist gerade nicht erreichbar.",
    supplierMode:
      "Das Stadtwerk bezahlt Ihre Nachbarn und stellt Ihnen den Betrag monatlich in Rechnung (Deutschland, §42c).",
    agentTitle: "Zahlungsagent",
    agentSuggests: (kwh: S, price: S, need: S, limit: S) =>
      `Aus Ihren letzten 14 Tagen (rund ${kwh} pro Tag von Nachbarn zu rund ${price}) braucht der Rest dieses Monats etwa ${need}. Er schlägt ein Limit von ${limit} vor, mit 20 % Puffer.`,
    agentApply: (limit: S) => `Den Agenten ${limit} setzen lassen`,
  },
  charts: {
    fromNeighbours: "von Nachbarn",
    unitHour: "kWh pro Stunde",
    unitQuarter: "kWh pro Viertelstunde",
    unitKwh: "kWh",
    unitCt: "ct pro kWh",
    floor: (ct: S) => `Einspeisung ${ct}`,
    cap: (ct: S) => `Netz ${ct}`,
    battery: "Im Speicher",
    forecastLine: "Prognose",
    range: "Wahrscheinlicher Bereich",
    generation: "Solarerzeugung",
    price: "Marktpreis",
    generated: "erzeugt",
    inBattery: "in der Batterie",
    forecast: "Prognose",
    expected: "erwartet",
    likelyRange: "wahrscheinlicher Bereich",
    capacity: (kwh: S) => `Kapazität ${kwh} kWh`,
    now: "Jetzt",
    yourUtility: "Ihr Versorger",
    usage: (name: S) => `Verbrauch ${name}`,
    used: (name: S) => `Verbrauch ${name}`,
    surplus: "Solarüberschuss im Viertel",
    surplusShort: "Überschuss im Viertel",
    solarGenerated: "Solar erzeugt",
    usedByNeighbours: "Von Nachbarn genutzt",
  },
  agent: {
    title: "Ihr Handelsagent",
    intro:
      "Ihr Agent handelt alle 15 Minuten für diesen Arbeitsbereich. Er entscheidet nach Prognosen: der gelernten Erzeugung und dem Verbrauch Ihres Hauses und dem Markt, einen Tag im Voraus auf den Prognosen aller Nachbarn gerechnet. Die Grenzen setzen Sie: in eigenen Worten, per Sprache oder mit den Schaltern.",
    noSite:
      "Dieser Arbeitsbereich hat keinen Standort, also gibt es für einen Agenten nichts zu handeln.",
    switches: "Was Ihr Agent darf",
    smartBattery: "Intelligenter Speicher",
    smartBatteryNote:
      "Speichert Mittagssolarstrom, wenn der Abend mehr bringt, und verkauft abends aus dem Speicher. Was Ihr Haus bis zum Sonnenaufgang braucht, behält er immer.",
    smartEv: "Intelligentes Laden",
    smartEvNote:
      "Lädt das Auto in den günstigsten Viertelstunden vor der Abfahrt, statt mit voller Leistung, sobald es eingesteckt ist.",
    readyBy: "Auto geladen bis (werktags)",
    noBattery: "Für diesen Standort ist kein Speicher eingetragen.",
    noEv: "Für diesen Standort ist keine Wallbox eingetragen.",
    supplierPick: "Lieferanten wählen",
    supplierPickNote:
      "Auf der Bezieher-Seite ordnet Ihr Agent die Erzeuger danach, was sie voraussichtlich liefern: ihre Prognose, gewichtet damit, wie oft sie zu diesen Stunden wirklich Überschuss hatten.",
    tell: "Sagen Sie es Ihrem Agenten",
    tellNote:
      "Schreiben oder sagen Sie, was Sie möchten, zum Beispiel: „Nie unter 18 Cent verkaufen, und Ben bekommt meinen Solarstrom zuerst.“ Ein Sprachmodell auf diesem Server macht daraus Einstellungen. Erst wenn Sie auf Übernehmen klicken, ändert sich etwas.",
    placeholder:
      "z. B. Lade mein Auto so günstig wie möglich, aber um 6 Uhr muss es voll sein.",
    examples: [
      "Verkaufe abends aus meinem Speicher, wenn es sich lohnt",
      "Zahle Nachbarn höchstens 22 Cent",
      "Kaufe nur im Umkreis von 1 km und bevorzuge die Webers",
    ],
    ask: "Agent fragen",
    thinking: "Das Sprachmodell denkt nach…",
    record: "🎙 Sprechen",
    stop: "■ Stopp",
    transcribing: "Wird verschriftlicht…",
    proposal: "Vorgeschlagene Änderungen",
    noChanges:
      "Keine Änderungen: Das entspricht Ihren Einstellungen, oder der Agent kann es nicht einstellen.",
    apply: "Übernehmen",
    discard: "Verwerfen",
    applied:
      "Übernommen. Der Agent nutzt die neuen Einstellungen ab der nächsten Viertelstunde.",
    clamped: "auf den erlaubten Bereich angepasst",
    on: "an",
    off: "aus",
    none: "niemand",
    oclock: (h: number) => `${String(h).padStart(2, "0")}:00 Uhr`,
    problems: {
      unknown_neighbour: (name: S) =>
        `„${name}“ ist kein Mitglied dieser Gemeinschaft.`,
      no_solar:
        "Sie haben keine Solaranlage, also gibt es nichts zu verkaufen.",
      no_battery: "Dieser Standort hat keinen Speicher.",
      no_ev: "Dieser Standort hat keine Wallbox.",
      unsupported: (text: S) => `Das kann der Agent nicht: ${text}`,
    },
    fields: {
      sellerMinPriceCt: "Mindestverkaufspreis",
      batteryReserveKwh: "Speicherreserve für den Abend",
      priorityBuyers: "Bekommen Ihren Solarstrom zuerst",
      buyerMaxPriceCt: "Höchster Kaufpreis",
      maxDistanceM: "Höchste Entfernung",
      preferredSellers: "Bevorzugte Erzeuger",
      blockedSellers: "Gesperrte Erzeuger",
      smartBattery: "Intelligenter Speicher",
      smartEv: "Intelligentes Laden",
      evReadyByHour: "Auto geladen bis",
    },
    log: "Was Ihr Agent getan hat",
    logNote:
      "Jede Entscheidung mit den Zahlen dahinter. Speicherentscheidungen werden protokolliert, wenn sie sich ändern.",
    nothingYet:
      "Ihr Agent hat noch nichts entschieden. Schalten Sie ihn ein und starten Sie dann die Live-Demo oder die Simulation.",
    explain: "In einfachen Worten erklären",
    explaining: "Wird erklärt…",
    listen: "🔊 Anhören",
    speaking: "Stimme wird vorbereitet…",
    byModel: (model: S) => `Geschrieben von ${model}, läuft auf diesem Server.`,
    plainFacts: "Das Sprachmodell läuft nicht, deshalb hier die reinen Fakten.",
    models: {
      title:
        "Verwendete Open-Source-Modelle (alle auf diesem Server, ohne API-Schlüssel)",
      llm: (model: S) => `Sprache: ${model} über Ollama`,
      stt: "Sprache zu Text: Whisper base (OpenAI, MIT-Lizenz)",
      tts: "Stimme: Piper-Stimmen Thorsten (Deutsch, CC0) und LibriTTS-R (Englisch, CC BY 4.0), Aussprache mit eSpeak NG (GPL-3.0)",
      ready: "bereit",
      notRunning: "Ollama läuft nicht. Starten mit: ollama serve",
      notPulled: (model: S) =>
        `Modell noch nicht geladen. Ausführen: ollama pull ${model}`,
      voiceNote:
        "Die Sprachmodelle werden beim ersten Sprechen oder Anhören einmalig geladen (etwa 220 MB).",
    },
    errors: {
      model:
        "Das Sprachmodell hat nicht geantwortet. Läuft Ollama (ollama serve)?",
      voice:
        "Das Sprachmodell für die Stimme ist fehlgeschlagen. Siehe Server-Log.",
      mic: "Der Browser hat das Mikrofon blockiert.",
      silence:
        "Keine Sprache gehört. Prüfen Sie das Mikrofon und sprechen Sie nach dem Klick auf Sprechen.",
      empty: "Schreiben oder sagen Sie zuerst etwas.",
    } as Record<S, S>,
    decisions: {
      battery_hold: (now: S, later: S) =>
        `Solarstrom gespeichert: Jetzt verkaufen bringt ${now}, heute Abend voraussichtlich ${later}.`,
      battery_sell_now: (now: S, later: S, need: S) =>
        `Überschuss sofort für ${now} verkauft: Speichern für den Abend (${later}) lohnt sich nach den Speicherverlusten nicht. ${need} bleiben für Ihr Haus heute Abend.`,
      battery_keep: (need: S, soc: S) =>
        `Speicher (${soc}) für den Eigenverbrauch behalten: Ihr Haus braucht etwa ${need}, bis die Sonne wieder scheint.`,
      battery_discharge: (kwh: S, now: S, need: S) =>
        `${kwh} pro Viertelstunde aus dem Speicher für ${now} verkauft, den besten Preis heute Abend. ${need} bleiben für Ihr Haus.`,
      ev_plan: (need: S, from: S, to: S, planned: S, asap: S, leaves: S) =>
        `${need} für das Auto zwischen ${from} und ${to} eingeplant (geladen bis ${leaves}): ${planned} statt ${asap} bei sofortigem Laden.`,
      rules: (fields: S) => `Sie haben geändert: ${fields}.`,
    },
  },
  verify: {
    title: "Öffentliches Protokoll",
    intro:
      "Jede abgerechnete Stunde wird hier veröffentlicht: jeder Handel unter einem pseudonymen Standortcode, und sein SHA-256 steht im Memo der Solana-Transaktionen dieser Stunde. Jede Person kann den Hash nachrechnen und mit der Blockchain vergleichen; niemand, auch nicht Volty, kann das Protokoll später unbemerkt ändern.",
    noneYet: "Noch keine abgerechneten Stunden.",
    hour: "Stunde",
    status: "Status",
    hash: "SHA-256",
    p2p: "Peer-to-Peer",
    check: "Prüfen",
    hourTitle: (day: S, from: S, to: S) => `${day}, ${from}–${to}`,
    verdict: {
      match:
        "✓ Bestätigt: Das veröffentlichte Protokoll passt zum Hash auf Solana.",
      mismatch: "✗ Passt nicht: Das Protokoll weicht vom Hash auf Solana ab.",
      legacy:
        "Abgerechnet, bevor vollständige Hashes veröffentlicht wurden: Das Memo enthält nur einen kurzen Hash, diese Stunde lässt sich nicht prüfen.",
      unavailable:
        "Solana war nicht erreichbar, um das Memo zu lesen. Bitte gleich noch einmal versuchen.",
      none: "Nicht auf der Blockchain gezahlt (simuliert), daher gibt es kein Memo zum Vergleich.",
    } as Record<S, S>,
    recomputed: "Hash des Protokolls, jetzt berechnet",
    onChain: "Hash im Solana-Memo",
    viewTx: "Transaktion ansehen",
    stored: "Bei der Abrechnung gespeicherter Hash",
    storedSame: "gleich",
    storedDifferent:
      "anders (die Stunde wurde mit einem älteren Protokollformat abgerechnet)",
    howTo:
      "Prüfen Sie es selbst, ohne dieser Seite zu vertrauen: Protokoll herunterladen und hashen.",
    download: (bytes: S) => `Protokoll herunterladen (JSON, ${bytes} Bytes)`,
    trades: (n: number) => `${n} Lieferungen in dieser Stunde`,
    tradesNote:
      "Die Codes sind pseudonym: Jedes Mitglied sieht seinen eigenen Code auf seiner Standortseite. „Netz“ ist Strom einer finanzierten Anlage, der zur Einspeisevergütung ins Netz geht.",
    time: "Zeit",
    from: "Von",
    to: "An",
    price: "Preis",
    grid: "Netz (Einspeisung)",
    yourCode: "Ihr öffentlicher Code",
    yourCodeNote:
      "Ihre Lieferungen erscheinen unter diesem Code im öffentlichen Protokoll. Nur Sie können ihn Ihrem Namen zuordnen.",
    open: "Öffentliches Protokoll öffnen",
  },
  federation: {
    toYou: "an Sie",
    fromYou: "von Ihnen",
    netIn: (kwh: S) => `${kwh} rein`,
    netOut: (kwh: S) => `${kwh} raus`,
    cannotShare: "Dürfen nicht mit uns teilen",
    short: {
      from_2028: "nächstes Netzgebiet: ab Juni 2028",
      not_sharing: "im Netz zu weit: normale Belieferung",
    } as Record<S, S>,
    kpiIn: "Von Nachbarn",
    kpiOut: "An Nachbarn",
    kpiSaved: "Gespart ggü. Netzpreis",
    kpiEarned: "Mehr als Einspeisung",
    perCommunity: "Je Gemeinschaft",
    colIn: "Rein",
    colOut: "Raus",
    colPaid: "Wir zahlten",
    colReceived: "Wir erhielten",
    latestSettlements: "Letzte Abrechnungen auf Solana",
    weePaid: "wir zahlten",
    theyPaid: "zahlte uns",
    todayTitle: (day: S, time: S) =>
      `Heute mit den Nachbarn (${day}, bis ${time} Uhr)`,
    onMap: "Auf der Karte ansehen",
    nothingToday:
      "Heute nichts ausgetauscht: Wenn wir Strom brauchten, hatten sie keinen übrig, und umgekehrt.",
    notUsed: {
      from_2028:
        "Nicht genutzt: angrenzendes Netzgebiet, Energy Sharing erst ab 1. Juni 2028 erlaubt.",
      not_sharing:
        "Nie genutzt: im Netz zu weit entfernt; das wäre normale Belieferung, kein Energy Sharing.",
    } as Record<S, S>,
    flowKind: {
      trade: "bezahlt",
      credit: "geliehen / verliehen",
      repay: "in Strom zurückgegeben",
      credit_settled: "Kredit in Geld bezahlt",
    } as Record<S, S>,
    title: "Verbund von Energiegemeinschaften",
    intro:
      "Was die Mitglieder nicht untereinander teilen können, geht an benachbarte Energiegemeinschaften: Überschuss an eine Gemeinschaft, der Strom fehlt, fehlender Strom von einer mit Überschuss. Strom fließt immer durch das eine verbundene Netz, entscheidend ist also, wie nah zwei Gemeinschaften darin sind. Das Modell wählt immer die nächste Gemeinschaft, die helfen darf.",
    on: "Verbund an",
    off: "Verbund aus",
    enable: "Mit benachbarten Gemeinschaften handeln",
    priceNote: (price: S, limit: S) =>
      `bezahlter Handel zu ${price}/kWh, in der Mitte zwischen Einspeisevergütung und Netzpreis; Energiekredite bis ${limit} kWh je Gemeinschaft`,
    offAdmin:
      "Schalten Sie den Verbund oben ein, um den restlichen Überschuss und Bedarf der Gemeinschaft mit den Nachbarn abzugleichen.",
    offMember: "Das Stadtwerk hat den Verbund noch nicht eingeschaltet.",
    levelsTitle: "Wo die Nachbarn im Netz liegen",
    levelsNote:
      "Näher ist besser: Je näher zwei Gemeinschaften sind, desto weniger Netzebenen nutzt ihr Austausch.",
    you: "Sie",
    level: {
      same_substation: "Gleiches Umspannwerk",
      same_area: "Gleiches Netzgebiet (§42c, erlaubt)",
      adjacent_area: "Angrenzendes Netzgebiet (§42c, ab 1. Juni 2028)",
      remote: "Weiter entfernt: normale Belieferung, kein Energy Sharing",
    } as Record<S, S>,
    chainNote:
      "Warum es keine Ketten von Gemeinschaften gibt (A bekommt von B, B von C): Strom folgt keinen Verträgen, eine Kette läuft also darauf hinaus, dass C an A liefert. Sie spart kein Netz und kann die rechtliche Grenze des Energy Sharing nicht verschieben.",
    allowed: "erlaubt",
    blocked: {
      from_2028: "ab 1. Juni 2028",
      not_sharing: "kein Energy Sharing",
    } as Record<S, S>,
    adviceTitle: (day: S, time: S) =>
      `Die nächsten 24 Stunden ab ${day} ${time}: die besten Gemeinschaften für den Austausch`,
    pick: (name: S) => `Empfehlung: ${name}.`,
    pickWhy: (level: S, inKwh: S, outKwh: S) =>
      `${level}; liefert uns voraussichtlich ${inKwh} und nimmt ${outKwh} unseres Überschusses.`,
    noPick:
      "Kein Austausch erwartet: In den nächsten 24 Stunden kann kein erlaubter Nachbar bei unserem Rest helfen.",
    adviceSummary: (
      short: S,
      covered: S,
      left: S,
      sold: S,
      saving: S,
      extra: S,
    ) =>
      `Uns fehlen voraussichtlich ${short}, übrig bleiben ${left}. Nachbarn decken ${covered} und nehmen ${sold}: ${saving} gespart gegenüber dem Netzpreis und ${extra} mehr als die Einspeisevergütung.`,
    adviceNote:
      "Prognose: unsere Seite aus den gelernten Prognosen der Mitglieder nach dem Teilen vor Ort, ihre aus demselben Wetter und ihrer Mischung aus Haushalten, Betrieben und Solar.",
    table: {
      hour: "Stunde",
      short: "Fehlt",
      left: "Übrig",
      best: "Bester Austausch",
      community: "Gemeinschaft",
      level: "Netzebene",
      status: "Status",
      exchanged: "Ausgetauscht (rein · raus)",
      credit: "Energiekredit",
      mode: "Art",
    },
    from: "von",
    to: "an",
    grid: "Netz",
    peersTitle: "Benachbarte Gemeinschaften",
    weOwe: (kwh: S) => `wir schulden ${kwh}`,
    theyOwe: (kwh: S) => `sie schulden ${kwh}`,
    mode: { trade: "stündlich bezahlt", credit: "Energiekredit" } as Record<
      S,
      S
    >,
    active: "aktiv",
    modeNote:
      "Energiekredit: Strom wird geliehen oder verliehen und in Strom zurückgegeben, sobald die andere Seite Bedarf und wir Überschuss haben (oder umgekehrt), älteste zuerst. Kredite, die nach 30 Tagen nicht zurückgegeben sind, werden zum Verbundpreis in Geld bezahlt.",
    historyTitle: "Bisher ausgetauscht",
    history: (inKwh: S, outKwh: S, saving: S, extra: S) =>
      `${inKwh} von Nachbarn, ${outKwh} an sie: ${saving} gespart gegenüber dem Netzpreis, ${extra} über der Einspeisevergütung verdient.`,
    paid: (name: S, eur: S) => `Wir haben ${name} ${eur} gezahlt`,
    received: (name: S, eur: S) => `${name} hat uns ${eur} gezahlt`,
    historyNote:
      "Jede Stunde wird das Geld auf Solana zwischen den Kassen der Gemeinschaften abgerechnet, und der Austausch ist Teil des öffentlichen Protokolls der Stunde.",
    honesty:
      "Demo: Die benachbarten Gemeinschaften sind simuliert (gleiches Wetter, eigene Mischung), ihre Lage im Netz ist beispielhaft; ein echter Verbund bekommt sie vom Netzbetreiber. Die Ersparnis bleibt vorerst beim Stadtwerk der Gemeinschaft.",
  },
  livePayments: {
    receivedTitle: "Erhaltene Zahlungen, live",
    paidTitle: "Geleistete Zahlungen, live",
    note: "Eine Zeile pro Stunde: alles, was in dieser Stunde gezahlt wurde, auf Solana abgerechnet, sobald die Stunde endet. Neue leuchten beim Eintreffen auf.",
    more: (n: number) => `+${n} weitere`,
    from: (name: S) => `von ${name}`,
    to: (name: S) => `an ${name}`,
    noneReceived: "Noch keine Zahlungen erhalten.",
    nonePaid: "Noch keine Zahlungen geleistet.",
  },
};
