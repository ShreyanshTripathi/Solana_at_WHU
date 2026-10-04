"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { createFormat } from "./format";
import { MESSAGES } from "./messages";

// Client components get the same messages and formatters. Only the locale crosses from the server
// (message functions can't be serialised), so both dictionaries ship in the client bundle.
const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  return useMemo(() => ({ locale, m: MESSAGES[locale], f: createFormat(locale) }), [locale]);
}
