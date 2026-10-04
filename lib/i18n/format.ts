import { COMMUNITY } from "@/lib/config";
import type { Locale } from "./config";

const TAG: Record<Locale, string> = { de: "de-DE", en: "en-GB" };
const zone = { timeZone: COMMUNITY.timeZone };

// Numbers, money and dates the way each language writes them: "1.234,50 €" and "Do., 1. Okt." in German,
// "€1,234.50" and "Thu 1 Oct" in English. Times are always the community's local time.
export function createFormat(locale: Locale) {
  const tag = TAG[locale];
  const num = (x: number, digits = 1) => x.toLocaleString(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return {
    locale,
    num,
    int: (x: number) => Math.round(x).toLocaleString(tag),
    eur: (x: number, digits = 2) =>
      x.toLocaleString(tag, { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }),
    kwh: (x: number, digits = 1) => `${num(x, digits)} kWh`,
    ct: (x: number) => `${x.toLocaleString(tag, { maximumFractionDigits: 2 })} ct`,
    pct: (x: number) => (locale === "de" ? `${Math.round(x * 100)} %` : `${Math.round(x * 100)}%`),
    time: (ts: number) => new Date(ts).toLocaleTimeString(tag, { ...zone, hour: "2-digit", minute: "2-digit" }),
    day: (ts: number) => new Date(ts).toLocaleDateString(tag, { ...zone, weekday: "short", day: "numeric", month: "short" }),
    date: (ts: number) => new Date(ts).toLocaleDateString(tag, { ...zone, day: "numeric", month: "long", year: "numeric" }),
    month: (ts: number) => new Date(ts).toLocaleDateString(tag, { ...zone, month: "long", year: "numeric" }),
    monthName: (ts: number) => new Date(ts).toLocaleDateString(tag, { ...zone, month: "long" }),
    dateTime: (ts: number) =>
      new Date(ts).toLocaleString(tag, { ...zone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
}

export type Format = ReturnType<typeof createFormat>;
