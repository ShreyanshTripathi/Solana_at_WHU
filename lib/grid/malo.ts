// Market location ID (Marktlokations-ID, "MaLo-ID"): the 11-digit number on a German electricity
// bill that identifies where power is metered. The 11th digit is a check digit (BDEW rule):
// odd positions summed, plus twice the even positions, then the step to the next multiple of 10.

export function maloCheckDigit(firstTen: string): number {
  let odd = 0;
  let even = 0;
  for (let i = 0; i < 10; i++) {
    const digit = Number(firstTen[i]);
    if (i % 2 === 0) odd += digit;
    else even += digit;
  }
  return (10 - ((odd + 2 * even) % 10)) % 10;
}

export const normaliseMaloId = (raw: string) => raw.replace(/\s+/g, "");

// Catches typos before we ask the grid operator: 11 digits, no leading zero, matching check digit.
export function isValidMaloId(raw: string): boolean {
  const id = normaliseMaloId(raw);
  return /^[1-9]\d{10}$/.test(id) && maloCheckDigit(id) === Number(id[10]);
}
