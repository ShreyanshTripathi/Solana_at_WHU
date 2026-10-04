import { COMMUNITY } from "@/lib/config";

// The demo neighbourhood: one supplier, sellers, buyers, one SME anchor,
// a Solar Now, Pay Never roof and its investors.

export type MemberKind = "household" | "sme" | "investor" | "supplier" | "platform";
export type LoadProfile = "household" | "bakery" | "business";

export interface Persona {
  id: string;
  name: string;
  kind: MemberKind;
  site?: {
    label: string;
    meterId: string; // market location ID (MaLo-ID), known to the demo grid operator
    street: string; // all demo homes are in 56179 Vallendar
    lat: number;
    lon: number;
    pvKwp: number;
    batteryKwh: number;
    loadProfile: LoadProfile;
    annualKwh: number;
  };
}

export const PERSONAS: Persona[] = [
  { id: "stadtwerk", name: "Stadtwerk Vallendar (demo)", kind: "supplier" },
  { id: "kiezwatt", name: "Volty platform fees", kind: "platform" },
  {
    id: "anna",
    name: "Anna Schmitt",
    kind: "household",
    site: {
      label: "Anna's house",
      meterId: "50178001018",
      street: "Höhrer Straße 12",
      lat: 50.4032,
      lon: 7.6188,
      pvKwp: 9.8,
      batteryKwh: 10,
      loadProfile: "household",
      annualKwh: 3200,
    },
  },
  {
    id: "carla",
    name: "Carla Becker",
    kind: "household",
    site: {
      label: "Carla's house",
      meterId: "50178001026",
      street: "Löhrstraße 30",
      lat: 50.3998,
      lon: 7.6251,
      pvKwp: 7,
      batteryKwh: 0,
      loadProfile: "household",
      annualKwh: 2800,
    },
  },
  {
    id: "weber",
    name: "Familie Weber",
    kind: "household",
    site: {
      label: "Weber barn roof",
      meterId: "50178001034",
      street: "Hillscheider Straße 5",
      lat: 50.4051,
      lon: 7.6232,
      pvKwp: 30,
      batteryKwh: 0,
      loadProfile: "household",
      annualKwh: 4000,
    },
  },
  {
    id: "ben",
    name: "Ben Wagner",
    kind: "household",
    site: {
      label: "Ben's flat",
      meterId: "50178001042",
      street: "Heerstraße 44",
      lat: 50.4015,
      lon: 7.6207,
      pvKwp: 0,
      batteryKwh: 0,
      loadProfile: "household",
      annualKwh: 3500,
    },
  },
  {
    id: "dana",
    name: "Dana Hoffmann",
    kind: "household",
    site: {
      label: "Dana's house",
      meterId: "50178001050",
      street: "Rheinstraße 18",
      lat: 50.3987,
      lon: 7.6179,
      pvKwp: 0,
      batteryKwh: 0,
      loadProfile: "household",
      annualKwh: 2500,
    },
  },
  {
    id: "emil",
    name: "Emil Koch",
    kind: "household",
    site: {
      label: "Emil's house",
      meterId: "50178001068",
      street: "Wilhelmstraße 7",
      lat: 50.4024,
      lon: 7.6266,
      pvKwp: 0,
      batteryKwh: 0,
      loadProfile: "household",
      annualKwh: 4200,
    },
  },
  {
    id: "baeckerei",
    name: "Bäckerei Müller",
    kind: "sme",
    site: {
      label: "Bäckerei Müller",
      meterId: "50178001076",
      street: "Löhrstraße 2",
      lat: 50.4008,
      lon: 7.6221,
      pvKwp: 0,
      batteryKwh: 0,
      loadProfile: "bakery",
      annualKwh: 50000,
    },
  },
  // The wider neighbourhood: more households and three small businesses with daytime use, so the
  // big roofs can sell most of their output locally (about 90% instead of two thirds).
  ...(
    [
      ["fatma", "Fatma Yilmaz", "household", "50178001159", "Annastraße 6", 50.4011, 7.6236, "household", 3200],
      ["georg", "Georg Neumann", "household", "50178001167", "Humboldthöhe 3", 50.4048, 7.6213, "household", 3800],
      ["hanna", "Hanna Richter", "household", "50178001175", "Goethestraße 14", 50.4001, 7.6249, "household", 2900],
      ["jonas", "Jonas Krämer", "household", "50178001183", "Mittelstraße 9", 50.3995, 7.6229, "household", 4500],
      ["frischemarkt", "Frischemarkt Vallendar", "sme", "50178001191", "Rheinstraße 25", 50.3991, 7.6196, "business", 90000],
      ["praxis", "Praxis Dr. Klein", "sme", "50178001208", "Hauptstraße 31", 50.4018, 7.6201, "business", 18000],
      ["schreinerei", "Schreinerei Lang", "sme", "50178001216", "Industriestraße 4", 50.4057, 7.6274, "business", 45000],
    ] as const
  ).map(
    ([id, name, kind, meterId, street, lat, lon, loadProfile, annualKwh]): Persona => ({
      id,
      name,
      kind,
      site: { label: name, meterId, street, lat, lon, pvKwp: 0, batteryKwh: 0, loadProfile, annualKwh },
    }),
  ),
  { id: "lena", name: "Lena (investor)", kind: "investor" },
  { id: "tom", name: "Tom (investor)", kind: "investor" },
];

// The demo businesses' SME check data (all well inside the EU SME limits).
export const DEMO_BUSINESS_PROFILES: Record<string, { staff: number; turnoverEur: number; balanceSheetEur: number }> = {
  baeckerei: { staff: 18, turnoverEur: 1_400_000, balanceSheetEur: 600_000 },
  frischemarkt: { staff: 24, turnoverEur: 4_800_000, balanceSheetEur: 1_200_000 },
  praxis: { staff: 7, turnoverEur: 900_000, balanceSheetEur: 350_000 },
  schreinerei: { staff: 12, turnoverEur: 1_900_000, balanceSheetEur: 800_000 },
};

// Who gets the default buying rules: every home and business with a meter.
export const DEMO_BUYERS = (): string[] => PERSONAS.filter((p) => p.site).map((p) => p.id);

// Wallets that exist on chain but are not people: one maintenance reserve per possible project roof.
export const SYSTEM_WALLETS = PERSONAS.filter((p) => p.kind === "household").map((p) => `reserve-${p.id}`);

export const walletNames = (): string[] => [...PERSONAS.map((p) => p.id), ...SYSTEM_WALLETS];

export const siteIdFor = (memberId: string) => `site-${memberId}`;

// A demo persona's site as stored: all demo homes are in Vallendar, in the community's grid area.
export function demoSiteDetails(p: Persona) {
  const { street, meterId, ...site } = p.site!;
  return { ...site, address: `${street}, 56179 Vallendar`, meterId, gridAreaId: COMMUNITY.gridAreaId };
}

// Demo logins: every persona except the fee account gets its own account (login) owning its
// workspace. Put your real email on an account (in the database) to log in with a magic link.
export const DEMO_EMAIL_DOMAIN = "@kiezwatt.example";
export const demoRoleFor = (p: Persona) => (p.kind === "supplier" ? ("stadtwerk_admin" as const) : ("member" as const));
export const demoAccounts = (now: number) =>
  PERSONAS.filter((p) => p.kind !== "platform").map((p) => ({
    account: { id: `acc-${p.id}`, email: `${p.id}${DEMO_EMAIL_DOMAIN}`, privyUserId: null, createdAt: now },
    link: { accountId: `acc-${p.id}`, memberId: p.id, createdAt: now },
  }));
