import type { ProvinceCode } from "../types";

/**
 * Canada federal + provincial estimates — tax year 2026.
 * Sources (primary):
 *   CRA T4032 payroll tables (Jan 2026) — federal brackets, BPA, CPP, EI
 *   CRA / KPMG 2026 provincial brackets (ON, QC, BC, AB updated; others indexed approx)
 *
 * Simplifications (documented in calculator accuracy notes):
 *   - BPA applied as a taxable-income deduction (real system is a non-refundable credit)
 *   - No Ontario surtax / health premium
 *   - No CPP2 above YMPE
 *   - QPIP omitted for Quebec
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

/** Federal brackets 2026 (lowest rate 14%) — CRA T4032 */
const FEDERAL_BRACKETS = [
  { upTo: 58523, rate: 0.14 },
  { upTo: 117045, rate: 0.205 },
  { upTo: 181440, rate: 0.26 },
  { upTo: 258482, rate: 0.29 },
  { upTo: Infinity, rate: 0.33 },
];

/** Enhanced federal BPA for typical earners (CRA 2026 maximum) */
const BASIC_PERSONAL_AMOUNT = 16452;

/** Progressive provincial rates — 2026 where sourced; others carried/indexed approx */
const PROVINCIAL: Record<ProvinceCode, { upTo: number; rate: number }[]> = {
  AB: [
    { upTo: 60000, rate: 0.08 },
    { upTo: 151234, rate: 0.1 },
    { upTo: 181481, rate: 0.12 },
    { upTo: 241974, rate: 0.13 },
    { upTo: 362961, rate: 0.14 },
    { upTo: Infinity, rate: 0.15 },
  ],
  BC: [
    { upTo: 49279, rate: 0.0506 },
    { upTo: 98558, rate: 0.077 },
    { upTo: 113158, rate: 0.105 },
    { upTo: 137407, rate: 0.1229 },
    { upTo: 186306, rate: 0.147 },
    { upTo: Infinity, rate: 0.168 },
  ],
  MB: [
    { upTo: 47000, rate: 0.108 },
    { upTo: 100000, rate: 0.1275 },
    { upTo: Infinity, rate: 0.174 },
  ],
  NB: [
    { upTo: 51306, rate: 0.094 },
    { upTo: 102614, rate: 0.14 },
    { upTo: 190060, rate: 0.16 },
    { upTo: Infinity, rate: 0.195 },
  ],
  NL: [
    { upTo: 44384, rate: 0.087 },
    { upTo: 88765, rate: 0.145 },
    { upTo: 158502, rate: 0.158 },
    { upTo: Infinity, rate: 0.208 },
  ],
  NS: [
    { upTo: 29590, rate: 0.0879 },
    { upTo: 59180, rate: 0.1495 },
    { upTo: 93000, rate: 0.1667 },
    { upTo: 150000, rate: 0.175 },
    { upTo: Infinity, rate: 0.21 },
  ],
  NT: [
    { upTo: 51964, rate: 0.059 },
    { upTo: 103930, rate: 0.086 },
    { upTo: 168967, rate: 0.122 },
    { upTo: Infinity, rate: 0.1405 },
  ],
  NU: [
    { upTo: 54708, rate: 0.04 },
    { upTo: 109413, rate: 0.07 },
    { upTo: 177882, rate: 0.09 },
    { upTo: Infinity, rate: 0.115 },
  ],
  ON: [
    { upTo: 53891, rate: 0.0505 },
    { upTo: 107785, rate: 0.0915 },
    { upTo: 150000, rate: 0.1116 },
    { upTo: 220000, rate: 0.1216 },
    { upTo: Infinity, rate: 0.1316 },
  ],
  PE: [
    { upTo: 33328, rate: 0.0965 },
    { upTo: 65656, rate: 0.1363 },
    { upTo: Infinity, rate: 0.1665 },
  ],
  QC: [
    { upTo: 54345, rate: 0.14 },
    { upTo: 108680, rate: 0.19 },
    { upTo: 132245, rate: 0.24 },
    { upTo: Infinity, rate: 0.2575 },
  ],
  SK: [
    { upTo: 53463, rate: 0.105 },
    { upTo: 152750, rate: 0.125 },
    { upTo: Infinity, rate: 0.145 },
  ],
  YT: [
    { upTo: 58523, rate: 0.064 },
    { upTo: 117045, rate: 0.09 },
    { upTo: 181440, rate: 0.109 },
    { upTo: 500000, rate: 0.128 },
    { upTo: Infinity, rate: 0.15 },
  ],
};

export function calculateCanadaTax(
  annualGross: number,
  province: ProvinceCode
): {
  federalTax: number;
  provincialTax: number;
  cpp: number;
  ei: number;
} {
  const taxable = Math.max(0, annualGross - BASIC_PERSONAL_AMOUNT);
  const federalTax = progressive(taxable, FEDERAL_BRACKETS);

  const provincialTax = progressive(taxable, PROVINCIAL[province]);

  // CPP / QPP + EI employee (2026 CRA)
  const isQuebec = province === "QC";
  const pensionMax = 74600;
  const pensionExempt = 3500;
  const pensionRate = isQuebec ? 0.064 : 0.0595;
  const cpp =
    Math.min(
      Math.max(0, annualGross - pensionExempt),
      pensionMax - pensionExempt
    ) * pensionRate;
  const eiRate = isQuebec ? 0.013 : 0.0163;
  const eiMax = 68900;
  const ei = Math.min(annualGross, eiMax) * eiRate;

  return { federalTax, provincialTax, cpp, ei };
}

export const CANADA_TAX_SOURCE =
  "CRA T4032 Jan 2026 (federal/CPP/EI) + 2026 provincial brackets (ON/QC/BC primary; others approx)";
