import type { FilingStatus, PayFrequency } from "../types";
import { PAY_PERIODS } from "../types";

/**
 * IRS Publication 15-T (2026) — Percentage Method for automated payroll.
 * Worksheet 1A + Annual Percentage Method tables (STANDARD / Step 2 checkbox).
 * Source: https://www.irs.gov/pub/irs-pdf/p15t.pdf
 */

type BracketRow = { upTo: number; rate: number; base: number };

/**
 * Worksheet 1A line 1g — subtracted when Form W-4 Step 2 is NOT checked.
 * Married filing jointly: $12,900; otherwise $8,600.
 */
const STEP1G_ADJUSTMENT: Record<FilingStatus, number> = {
  single: 8600,
  married: 12900,
  head: 8600,
};

/**
 * STANDARD Withholding Rate Schedules
 * (Step 2 box NOT checked, or Form W-4 from 2019 or earlier)
 */
const WITHHOLDING_BRACKETS: Record<FilingStatus, BracketRow[]> = {
  married: [
    { upTo: 19300, rate: 0, base: 0 },
    { upTo: 44100, rate: 0.1, base: 0 },
    { upTo: 120100, rate: 0.12, base: 2480 },
    { upTo: 230700, rate: 0.22, base: 11600 },
    { upTo: 422850, rate: 0.24, base: 35932 },
    { upTo: 531750, rate: 0.32, base: 82048 },
    { upTo: 788000, rate: 0.35, base: 116896 },
    { upTo: Infinity, rate: 0.37, base: 206583.5 },
  ],
  single: [
    { upTo: 7500, rate: 0, base: 0 },
    { upTo: 19900, rate: 0.1, base: 0 },
    { upTo: 57900, rate: 0.12, base: 1240 },
    { upTo: 113200, rate: 0.22, base: 5800 },
    { upTo: 209275, rate: 0.24, base: 17966 },
    { upTo: 263725, rate: 0.32, base: 41024 },
    { upTo: 648100, rate: 0.35, base: 58448 },
    { upTo: Infinity, rate: 0.37, base: 192979.25 },
  ],
  head: [
    { upTo: 15550, rate: 0, base: 0 },
    { upTo: 33250, rate: 0.1, base: 0 },
    { upTo: 83000, rate: 0.12, base: 1770 },
    { upTo: 121250, rate: 0.22, base: 7740 },
    { upTo: 217300, rate: 0.24, base: 16155 },
    { upTo: 271750, rate: 0.32, base: 39207 },
    { upTo: 656150, rate: 0.35, base: 56631 },
    { upTo: Infinity, rate: 0.37, base: 191171 },
  ],
};

/**
 * Form W-4 Step 2 Checkbox Withholding Rate Schedules
 * (Step 2 box IS checked — dual-income / multiple jobs)
 */
const STEP2_CHECKED_BRACKETS: Record<FilingStatus, BracketRow[]> = {
  married: [
    { upTo: 16100, rate: 0, base: 0 },
    { upTo: 28500, rate: 0.1, base: 0 },
    { upTo: 66500, rate: 0.12, base: 1240 },
    { upTo: 121800, rate: 0.22, base: 5800 },
    { upTo: 217875, rate: 0.24, base: 17966 },
    { upTo: 272325, rate: 0.32, base: 41024 },
    { upTo: 400450, rate: 0.35, base: 58448 },
    { upTo: Infinity, rate: 0.37, base: 103291.75 },
  ],
  single: [
    { upTo: 8050, rate: 0, base: 0 },
    { upTo: 14250, rate: 0.1, base: 0 },
    { upTo: 33250, rate: 0.12, base: 620 },
    { upTo: 60900, rate: 0.22, base: 2900 },
    { upTo: 108938, rate: 0.24, base: 8983 },
    { upTo: 136163, rate: 0.32, base: 20512 },
    { upTo: 328350, rate: 0.35, base: 29224 },
    { upTo: Infinity, rate: 0.37, base: 96489.63 },
  ],
  head: [
    { upTo: 12075, rate: 0, base: 0 },
    { upTo: 20925, rate: 0.1, base: 0 },
    { upTo: 45800, rate: 0.12, base: 885 },
    { upTo: 64925, rate: 0.22, base: 3870 },
    { upTo: 112950, rate: 0.24, base: 8077.5 },
    { upTo: 140175, rate: 0.32, base: 19603.5 },
    { upTo: 332375, rate: 0.35, base: 28315.5 },
    { upTo: Infinity, rate: 0.37, base: 95585.5 },
  ],
};

const SUPPLEMENTAL_RATE = 0.22;
const SUPPLEMENTAL_RATE_HIGH = 0.37;
const SUPPLEMENTAL_HIGH_THRESHOLD = 1_000_000;

function taxFromBracketTable(
  annualWage: number,
  brackets: BracketRow[]
): number {
  if (annualWage <= 0) return 0;
  let prev = 0;
  for (const row of brackets) {
    if (annualWage <= row.upTo) {
      return row.base + (annualWage - prev) * row.rate;
    }
    prev = row.upTo;
  }
  const last = brackets[brackets.length - 1];
  return last.base + (annualWage - prev) * last.rate;
}

export interface FederalWithholdingInput {
  /** Taxable wages for FIT for the pay period (after pre-tax deductions that reduce FIT) */
  wagesPerPeriod: number;
  payFrequency: PayFrequency;
  filingStatus: FilingStatus;
  /** Form W-4 Step 2(c) — multiple jobs / spouse works */
  w4Step2?: boolean;
  /** Form W-4 Step 3 — annual dollar credit for dependents */
  w4DependentsCredit?: number;
  /** Form W-4 Step 4(a) — other income (annual) */
  w4OtherIncome?: number;
  /** Form W-4 Step 4(b) — deductions (annual) */
  w4Deductions?: number;
  /** Form W-4 Step 4(c) — extra withholding per period */
  w4ExtraWithholding?: number;
  /** Treat this period's bonus with supplemental flat rate */
  supplementalBonus?: number;
  useSupplementalRate?: boolean;
}

export interface FederalWithholdingResult {
  /** Federal income tax withheld for the pay period */
  perPeriod: number;
  annualized: number;
  method: "percentage" | "supplemental-blend";
}

/**
 * Calculate federal income tax withholding for one paycheck
 * (Pub 15-T 2026 Worksheet 1A percentage method).
 */
export function calculateFederalWithholding(
  input: FederalWithholdingInput
): FederalWithholdingResult {
  const {
    wagesPerPeriod,
    payFrequency,
    filingStatus,
    w4Step2 = false,
    w4DependentsCredit = 0,
    w4OtherIncome = 0,
    w4Deductions = 0,
    w4ExtraWithholding = 0,
    supplementalBonus = 0,
    useSupplementalRate = false,
  } = input;

  const periods = PAY_PERIODS[payFrequency];

  let regularWages = wagesPerPeriod;
  let bonus = supplementalBonus;

  let supplementalWithholding = 0;
  if (useSupplementalRate && bonus > 0) {
    const rate =
      bonus * periods > SUPPLEMENTAL_HIGH_THRESHOLD
        ? SUPPLEMENTAL_RATE_HIGH
        : SUPPLEMENTAL_RATE;
    supplementalWithholding = bonus * rate;
  } else if (bonus > 0) {
    regularWages += bonus;
    bonus = 0;
  }

  // Worksheet 1A Step 1 — annualize + Step 4(a)/(b) + Step 1g adjustment
  let annualWages = regularWages * periods;
  annualWages += w4OtherIncome;
  annualWages = Math.max(0, annualWages - w4Deductions);

  if (!w4Step2) {
    annualWages = Math.max(0, annualWages - STEP1G_ADJUSTMENT[filingStatus]);
  }

  const brackets = w4Step2
    ? STEP2_CHECKED_BRACKETS[filingStatus]
    : WITHHOLDING_BRACKETS[filingStatus];

  const annualTax = taxFromBracketTable(annualWages, brackets);
  let perPeriod = annualTax / periods;

  // Step 3 dependent credit (annual → per period)
  perPeriod = Math.max(0, perPeriod - w4DependentsCredit / periods);

  // Step 4(c)
  perPeriod += Math.max(0, w4ExtraWithholding);
  perPeriod += supplementalWithholding;

  return {
    perPeriod: Math.max(0, perPeriod),
    annualized: Math.max(0, perPeriod * periods),
    method:
      useSupplementalRate && supplementalBonus > 0
        ? "supplemental-blend"
        : "percentage",
  };
}

/** Flat supplemental rate helper for bonuses paid separately */
export function supplementalFederalRate(annualBonusTotal: number): number {
  return annualBonusTotal > SUPPLEMENTAL_HIGH_THRESHOLD
    ? SUPPLEMENTAL_RATE_HIGH
    : SUPPLEMENTAL_RATE;
}

export const FEDERAL_WITHHOLDING_SOURCE =
  "IRS Publication 15-T (2026) — Worksheet 1A Percentage Method + Annual Percentage Method tables";
