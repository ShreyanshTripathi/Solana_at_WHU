import { describe, expect, it } from "vitest";
import { clearFailures, hashPassword, isLockedOut, recordFailure, verifyPassword } from "@/lib/auth/password";
import { openGridOperator } from "@/lib/grid/openOperator";

describe("passwords", () => {
  it("stores a salted hash that only the right password matches", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).not.toContain("correct");
    expect(a).not.toBe(b); // a fresh salt each time
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("correct horse batterY", a)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", "garbage")).toBe(false);
  });

  it("pauses an email after five wrong tries, for 15 minutes", () => {
    const email = "lock@example.com";
    clearFailures(email);
    for (let i = 0; i < 4; i++) recordFailure(email, 1000);
    expect(isLockedOut(email, 1000)).toBe(false);
    recordFailure(email, 1000);
    expect(isLockedOut(email, 1000)).toBe(true);
    expect(isLockedOut(email, 1000 + 16 * 60 * 1000)).toBe(false);
  });
});

describe("open grid operator (product copy)", () => {
  it("accepts any meter at the typed address, in the community's grid area", async () => {
    const op = openGridOperator({ street: " Hauptstraße 1 ", postcode: "10115", city: "Berlin" }, "AREA");
    const a = await op.lookupMarketLocation("12345678901");
    expect(a).toMatchObject({ street: "Hauptstraße 1", postcode: "10115", city: "Berlin", gridAreaId: "AREA" });
    expect(await op.lookupMarketLocation("12345678901")).toEqual(a); // same meter, same place
  });
});
