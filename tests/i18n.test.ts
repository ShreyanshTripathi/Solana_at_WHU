import { describe, expect, it } from "vitest";
import { pickLocale } from "@/lib/i18n/config";
import { createFormat } from "@/lib/i18n/format";
import { MESSAGES } from "@/lib/i18n/messages";
import { rejectionText } from "@/lib/i18n/text";

describe("choosing the language", () => {
  it("prefers the saved choice", () => {
    expect(pickLocale("de", "en-US,en;q=0.9")).toBe("de");
    expect(pickLocale("en", "de-DE")).toBe("en");
  });

  it("otherwise follows the browser's languages by preference", () => {
    expect(pickLocale(undefined, "de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(pickLocale(undefined, "en-GB,de;q=0.5")).toBe("en");
    expect(pickLocale(undefined, "fr-FR,fr;q=0.9,de;q=0.4")).toBe("de");
    expect(pickLocale(undefined, "en;q=0.2,de;q=0.8")).toBe("de");
  });

  it("falls back to English for unknown or missing values", () => {
    expect(pickLocale("xx", "fr-FR")).toBe("en");
    expect(pickLocale(undefined, null)).toBe("en");
  });
});

describe("formatting", () => {
  const de = createFormat("de");
  const en = createFormat("en");
  const ts = Date.parse("2026-10-01T11:45:00Z"); // 13:45 in Vallendar

  it("writes money and numbers the way each language does", () => {
    expect(de.eur(1234.5).replace(/\s/g, " ")).toBe("1.234,50 €");
    expect(en.eur(1234.5)).toBe("€1,234.50");
    expect(de.kwh(12.345, 2)).toBe("12,35 kWh");
    expect(en.kwh(12.345, 2)).toBe("12.35 kWh");
    expect(de.pct(0.39)).toBe("39 %");
    expect(en.pct(0.39)).toBe("39%");
  });

  it("shows times and months in the community's time zone", () => {
    expect(de.time(ts)).toBe("13:45");
    expect(en.time(ts)).toBe("13:45");
    expect(de.month(ts)).toBe("Oktober 2026");
    expect(en.month(ts)).toBe("October 2026");
  });
});

describe("the two dictionaries", () => {
  // TypeScript already checks that de has every key en has; this catches empty or untranslated text.
  const leaves = (o: unknown, path = ""): [string, unknown][] =>
    o && typeof o === "object" && !Array.isArray(o)
      ? Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
      : Array.isArray(o)
        ? o.flatMap((v, i) => leaves(v, `${path}[${i}]`))
        : [[path, o]];

  it("has no empty strings in either language", () => {
    for (const locale of ["de", "en"] as const) {
      const empty = leaves(MESSAGES[locale]).filter(([, v]) => v === "");
      expect(empty, `${locale}: ${empty.map(([p]) => p).join(", ")}`).toEqual([]);
    }
  });

  it("has the same keys in both", () => {
    const keys = (l: "de" | "en") => leaves(MESSAGES[l]).map(([p]) => p).sort();
    expect(keys("de")).toEqual(keys("en"));
  });

  it("words a stored rejection reason in each language", () => {
    const reason = { code: "outside_grid_area" as const, gridAreaId: "DE-DEMO-KOBLENZ", communityGridAreaId: "DE-DEMO-VALLENDAR" };
    expect(rejectionText(MESSAGES.en, reason)).toMatch(/outside the community's grid area/);
    expect(rejectionText(MESSAGES.de, reason)).toMatch(/außerhalb des Netzgebiets der Gemeinschaft/);
  });
});
