// EU SME definition (Recommendation 2003/361/EC): fewer than 250 staff, and either
// turnover up to €50M or a balance sheet total up to €43M. §42c EnWG excludes larger companies.
export const SME_LIMITS = { staff: 250, turnoverEur: 50_000_000, balanceSheetEur: 43_000_000 };

// Reasons are codes; the page words them in the reader's language.
export type SmeReason = { code: "staff"; staff: number } | { code: "financials" };

export interface SmeCheck {
  eligible: boolean;
  reasons: SmeReason[];
}

export function checkSme(staff: number, turnoverEur: number, balanceSheetEur: number): SmeCheck {
  const reasons: SmeReason[] = [];
  if (staff >= SME_LIMITS.staff) reasons.push({ code: "staff", staff });
  if (turnoverEur > SME_LIMITS.turnoverEur && balanceSheetEur > SME_LIMITS.balanceSheetEur) reasons.push({ code: "financials" });
  return { eligible: reasons.length === 0, reasons };
}

// §42c only lets SMEs share energy, and the check is re-confirmed every year (FR-SME-01).
export const SME_RECHECK_MS = 365 * 24 * 60 * 60 * 1000;
export type SmeStatus = "eligible" | "ineligible" | "expired" | "unchecked";

export function smeStatus(verified: boolean, checkedAt: number | null | undefined, now: number): SmeStatus {
  if (checkedAt == null) return "unchecked";
  if (!verified) return "ineligible";
  return now - checkedAt > SME_RECHECK_MS ? "expired" : "eligible";
}
