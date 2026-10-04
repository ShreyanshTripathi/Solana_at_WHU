import type { Locale } from "@/lib/i18n/config";

// Text as a voice should say it. eSpeak (which turns text into sounds for the Piper voices) reads
// numbers itself, but not units or euro amounts the way people say them.
export function speechText(text: string, locale: Locale): string {
  const de = locale === "de";
  return (
    text
      // € 0.87 / 0,87 € -> 87 cents; € 3.05 / 3,05 € -> 3 euros 5
      .replace(/€\s?(\d+)[.,](\d{2})\b|(\d+)[.,](\d{2})\s?€/g, (_, a, b, c, d) => {
        const euros = Number(a ?? c);
        const cents = Number(b ?? d);
        if (euros === 0) return de ? `${cents} Cent` : `${cents} cents`;
        return de ? `${euros} Euro${cents ? ` ${cents}` : ""}` : `${euros} euros${cents ? ` ${cents}` : ""}`;
      })
      .replace(/€\s?(\d+)|(\d+)\s?€/g, (_, a, b) => (de ? `${a ?? b} Euro` : `${a ?? b} euros`))
      .replace(/(\d)\s?ct\b/g, de ? "$1 Cent" : "$1 cents")
      .replace(/(\d)\s?kWh\b/g, de ? "$1 Kilowattstunden" : "$1 kilowatt hours")
      .replace(/(\d)\s?kWp\b/g, de ? "$1 Kilowatt peak" : "$1 kilowatt peak")
      .replace(/(\d)\s?%/g, de ? "$1 Prozent" : "$1 percent")
      .replace(/[“”„"]/g, "")
  );
}
