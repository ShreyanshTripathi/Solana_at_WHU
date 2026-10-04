import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { type Locale, LOCALE_COOKIE, pickLocale } from "./config";
import { createFormat } from "./format";
import { MESSAGES } from "./messages";

// The visitor's language: their saved choice, else their browser's, else English.
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  return pickLocale(saved, (await headers()).get("accept-language"));
});

// Server components: `const { m, f } = await getI18n();` then m.seller.title, f.eur(12.5).
export const getI18n = cache(async () => {
  const locale = await getLocale();
  return { locale, m: MESSAGES[locale], f: createFormat(locale) };
});
