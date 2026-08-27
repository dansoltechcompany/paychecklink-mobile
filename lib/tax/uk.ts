import type { UkNation } from "../types";

/**
 * UK PAYE / Class 1 NI estimates — 2026/27 (and frozen rUK 2025/26) bands.
 * Sources:
 *   HMRC “Rates and thresholds for employers 2025 to 2026”
 *   GOV.UK Income Tax rates (England/NI/Wales frozen into 2026/27)
 *   mygov.scot Scottish Income Tax 2026 to 2027
 */

function progressive(
  income: number,
  brackets: { upTo: number; rate: number }[]
): number {
  if (income <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const { upTo, rate } of brackets) {
    const slice = Math.min(income, upTo) - prev;
    if (slice <= 0) break;
    tax += slice * rate;
    prev = upTo;
  }
  return tax;
}

const PERSONAL_ALLOWANCE_FULL = 12570;
const PA_TAPER_START = 100000;
const PA_TAPER_END = 125140;

/** Personal Allowance shrinks £1 for every £2 over £100k */
export function ukPersonalAllowance(annualGross: number): number {
  if (annualGross <= PA_TAPER_START) return PERSONAL_ALLOWANCE_FULL;
  if (annualGross >= PA_TAPER_END) return 0;
  const reduction = Math.floor((annualGross - PA_TAPER_START) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE_FULL - reduction);
}

/** England / Wales / NI — taxable income bands (after personal allowance) */
const RUK_BANDS = [
  { upTo: 37700, rate: 0.2 },
  { upTo: 125140 - PERSONAL_ALLOWANCE_FULL, rate: 0.4 },
  { upTo: Infinity, rate: 0.45 },
];

/**
 * Scotland 2026/27 — taxable income band caps (gross band − £12,570 PA).
 * Gross bands: £16,537 / £29,526 / £43,662 / £75,000 / £125,140 / above.
 */
const SCOTLAND_BANDS = [
  { upTo: 3967, rate: 0.19 },
  { upTo: 16956, rate: 0.2 },
  { upTo: 31092, rate: 0.21 },
  { upTo: 62430, rate: 0.42 },
  { upTo: 125140 - PERSONAL_ALLOWANCE_FULL, rate: 0.45 },
  { upTo: Infinity, rate: 0.48 },
];

export function calculateUkTax(
  annualGross: number,
  nation: UkNation = "england"
): {
  incomeTax: number;
  nationalInsurance: number;
} {
  const allowance = ukPersonalAllowance(annualGross);
  const taxable = Math.max(0, annualGross - allowance);

  const bands = nation === "scotland" ? SCOTLAND_BANDS : RUK_BANDS;
  const incomeTax = progressive(taxable, bands);

  // Employee Class 1 NI (UK-wide thresholds; 8% / 2%)
  const niPrimaryThreshold = 12570;
  const niUpper = 50270;
  let nationalInsurance = 0;
  if (annualGross > niPrimaryThreshold) {
    const basic = Math.min(annualGross, niUpper) - niPrimaryThreshold;
    nationalInsurance += Math.max(0, basic) * 0.08;
    if (annualGross > niUpper) {
      nationalInsurance += (annualGross - niUpper) * 0.02;
    }
  }

  return { incomeTax, nationalInsurance };
}

export const UK_TAX_SOURCE =
  "HMRC employer rates 2025/26 + GOV.UK IT bands (rUK) + mygov.scot Scottish IT 2026/27; Class 1 NI 8%/2%";
