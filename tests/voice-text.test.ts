import { describe, expect, it } from "vitest";
import { speechText } from "@/lib/voice/text";

describe("text for the voice", () => {
  it("says euro amounts the way people do", () => {
    expect(speechText("€0.87, against €3.05", "en")).toBe("87 cents, against 3 euros 5");
    expect(speechText("0,87 € statt 3,05 €", "de")).toBe("87 Cent statt 3 Euro 5");
    expect(speechText("€12", "en")).toBe("12 euros");
  });

  it("spells out units", () => {
    expect(speechText("25 ct for 5.4 kWh", "en")).toBe("25 cents for 5.4 kilowatt hours");
    expect(speechText("25 ct für 5,4 kWh, 100 %", "de")).toBe("25 Cent für 5,4 Kilowattstunden, 100 Prozent");
  });
});
