import type { FilingStatus, StateCode } from "../types";
import { applyCaExemptionCredits } from "./ca-credits";

type Bracket = { upTo: number; rate: number };

type StateTaxConfig =
  | { type: "none" }
  | {
      type: "flat";
      rate: number;
      /** Optional state standard deduction (Tax Foundation / state DoR 2026) */
      standardDeduction?: Record<FilingStatus, number>;
    }
  | {
      type: "progressive";
      brackets: Bracket[];
      /** Override brackets by filing status (e.g. CA Schedule X/Y/Z) */
      bracketsByStatus?: Partial<Record<FilingStatus, Bracket[]>>;
      standardDeduction?: Record<FilingStatus, number>;
    };

/** Shared helper — head of household uses single amounts when state does not publish separate HOH. */
function sd(
  single: number,
  married: number,
  head = single
): Record<FilingStatus, number> {
  return { single, married, head };
}

/**
 * FTB 2025 Schedule X — Single / Married filing separately
 * (tax year used for 2026 withholding estimates until FTB publishes 2026 schedules)
 */
const CA_SCHEDULE_X: Bracket[] = [
  { upTo: 11079, rate: 0.01 },
  { upTo: 26264, rate: 0.02 },
  { upTo: 41452, rate: 0.04 },
  { upTo: 57542, rate: 0.06 },
  { upTo: 72724, rate: 0.08 },
  { upTo: 371479, rate: 0.093 },
  { upTo: 445771, rate: 0.103 },
  { upTo: 742953, rate: 0.113 },
  { upTo: Infinity, rate: 0.123 },
];

/** FTB 2025 Schedule Y — Married filing jointly / Qualifying widow(er) */
const CA_SCHEDULE_Y: Bracket[] = [
  { upTo: 22158, rate: 0.01 },
  { upTo: 52528, rate: 0.02 },
  { upTo: 82904, rate: 0.04 },
  { upTo: 115084, rate: 0.06 },
  { upTo: 145448, rate: 0.08 },
  { upTo: 742958, rate: 0.093 },
  { upTo: 891542, rate: 0.103 },
  { upTo: 1485906, rate: 0.113 },
  { upTo: Infinity, rate: 0.123 },
];

/** FTB 2025 Schedule Z — Head of household */
const CA_SCHEDULE_Z: Bracket[] = [
  { upTo: 22173, rate: 0.01 },
  { upTo: 52530, rate: 0.02 },
  { upTo: 67716, rate: 0.04 },
  { upTo: 83805, rate: 0.06 },
  { upTo: 98990, rate: 0.08 },
  { upTo: 505208, rate: 0.093 },
  { upTo: 606251, rate: 0.103 },
  { upTo: 1010417, rate: 0.113 },
  { upTo: Infinity, rate: 0.123 },
];

/**
 * 2026 state income tax configs.
 *
 * Prefer primary sources when they post-date Tax Foundation’s Jan 1, 2026 snapshot:
 *   GA HB 463 (May 11, 2026) · UT SB 60 (Mar 2026) · SC H.4216 (Mar 30, 2026)
 *
 * Secondary: Tax Foundation State Income Tax Rates and Brackets 2026
 * https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
 *
 * CA / NY keep FTB / IT-201 schedules verified separately (do not regress).
 * Personal exemption credits are modeled for CA only; other states use rate
 * tables ± standard deduction where listed (exemptions noted in methodology).
 */
export const STATE_TAX: Record<StateCode, StateTaxConfig> = {
  AL: {
    type: "progressive",
    brackets: [
      { upTo: 500, rate: 0.02 },
      { upTo: 3000, rate: 0.04 },
      { upTo: Infinity, rate: 0.05 },
    ],
    standardDeduction: sd(3000, 8500),
  },
  AK: { type: "none" },
  AZ: { type: "flat", rate: 0.025, standardDeduction: sd(8350, 16700) },
  AR: {
    type: "progressive",
    brackets: [
      { upTo: 4600, rate: 0.02 },
      { upTo: Infinity, rate: 0.039 },
    ],
    standardDeduction: sd(2470, 4940),
  },
  CA: {
    type: "progressive",
    brackets: CA_SCHEDULE_X,
    bracketsByStatus: {
      single: CA_SCHEDULE_X,
      married: CA_SCHEDULE_Y,
      head: CA_SCHEDULE_Z,
    },
    // FTB 2025 standard deduction (Form 540) — verified separately
    standardDeduction: {
      single: 5706,
      married: 11412,
      head: 11412,
    },
  },
  CO: { type: "flat", rate: 0.044, standardDeduction: sd(16100, 32200) },
  CT: {
    type: "progressive",
    brackets: [
      { upTo: 10000, rate: 0.02 },
      { upTo: 50000, rate: 0.045 },
      { upTo: 100000, rate: 0.055 },
      { upTo: 200000, rate: 0.06 },
      { upTo: 250000, rate: 0.065 },
      { upTo: 500000, rate: 0.069 },
      { upTo: Infinity, rate: 0.0699 },
    ],
  },
  DE: {
    type: "progressive",
    brackets: [
      { upTo: 2000, rate: 0.0 },
      { upTo: 5000, rate: 0.022 },
      { upTo: 10000, rate: 0.039 },
      { upTo: 20000, rate: 0.048 },
      { upTo: 25000, rate: 0.052 },
      { upTo: 60000, rate: 0.0555 },
      { upTo: Infinity, rate: 0.066 },
    ],
    standardDeduction: sd(3250, 6500),
  },
  FL: { type: "none" },
  GA: {
    type: "flat",
    rate: 0.0499,
    // HB 463 (signed May 11, 2026), retroactive to Jan 1, 2026 — gov.georgia.gov
    standardDeduction: sd(15000, 30000),
  },
  HI: {
    type: "progressive",
    brackets: [
      { upTo: 9600, rate: 0.014 },
      { upTo: 14400, rate: 0.032 },
      { upTo: 19200, rate: 0.055 },
      { upTo: 24000, rate: 0.064 },
      { upTo: 36000, rate: 0.068 },
      { upTo: 48000, rate: 0.072 },
      { upTo: 125000, rate: 0.076 },
      { upTo: 175000, rate: 0.079 },
      { upTo: 225000, rate: 0.0825 },
      { upTo: 275000, rate: 0.09 },
      { upTo: 325000, rate: 0.1 },
      { upTo: Infinity, rate: 0.11 },
    ],
    standardDeduction: sd(4400, 8800),
  },
  ID: {
    // Idaho STC Form 40 (2026): 5.3% after federal SD and $4,811 single / $9,622 joint zero bracket
    type: "progressive",
    brackets: [
      { upTo: 4811, rate: 0.0 },
      { upTo: Infinity, rate: 0.053 },
    ],
    bracketsByStatus: {
      single: [
        { upTo: 4811, rate: 0.0 },
        { upTo: Infinity, rate: 0.053 },
      ],
      married: [
        { upTo: 9622, rate: 0.0 },
        { upTo: Infinity, rate: 0.053 },
      ],
      head: [
        { upTo: 9622, rate: 0.0 },
        { upTo: Infinity, rate: 0.053 },
      ],
    },
    standardDeduction: sd(16100, 32200),
  },
  IL: { type: "flat", rate: 0.0495 },
  IN: { type: "flat", rate: 0.0295 },
  IA: { type: "flat", rate: 0.038, standardDeduction: sd(16100, 32200) },
  KS: {
    type: "progressive",
    brackets: [
      { upTo: 23000, rate: 0.052 },
      { upTo: Infinity, rate: 0.0558 },
    ],
    standardDeduction: sd(3605, 8240),
  },
  KY: { type: "flat", rate: 0.035, standardDeduction: sd(3360, 3360) },
  LA: { type: "flat", rate: 0.03, standardDeduction: sd(12875, 25750) },
  ME: {
    type: "progressive",
    brackets: [
      { upTo: 27399, rate: 0.058 },
      { upTo: 64849, rate: 0.0675 },
      { upTo: Infinity, rate: 0.0715 },
    ],
    standardDeduction: sd(8350, 16700),
  },
  MD: {
    type: "progressive",
    brackets: [
      { upTo: 1000, rate: 0.02 },
      { upTo: 2000, rate: 0.03 },
      { upTo: 3000, rate: 0.04 },
      { upTo: 100000, rate: 0.0475 },
      { upTo: 125000, rate: 0.05 },
      { upTo: 150000, rate: 0.0525 },
      { upTo: 250000, rate: 0.055 },
      { upTo: 500000, rate: 0.0575 },
      { upTo: 1000000, rate: 0.0625 },
      { upTo: Infinity, rate: 0.065 },
    ],
    standardDeduction: sd(3350, 6700),
  },
  MA: { type: "flat", rate: 0.05 },
  MI: { type: "flat", rate: 0.0425 },
  MN: {
    type: "progressive",
    brackets: [
      { upTo: 33310, rate: 0.0535 },
      { upTo: 109430, rate: 0.068 },
      { upTo: 203150, rate: 0.0785 },
      { upTo: Infinity, rate: 0.0985 },
    ],
    standardDeduction: sd(15300, 30600),
  },
  MS: {
    type: "progressive",
    brackets: [
      { upTo: 10000, rate: 0.0 },
      { upTo: Infinity, rate: 0.04 },
    ],
    standardDeduction: sd(2300, 4600),
  },
  MO: {
    type: "progressive",
    brackets: [
      { upTo: 1348, rate: 0.0 },
      { upTo: 2696, rate: 0.02 },
      { upTo: 4044, rate: 0.025 },
      { upTo: 5392, rate: 0.03 },
      { upTo: 6740, rate: 0.035 },
      { upTo: 8088, rate: 0.04 },
      { upTo: 9436, rate: 0.045 },
      { upTo: Infinity, rate: 0.047 },
    ],
    standardDeduction: sd(16100, 32200),
  },
  MT: {
    type: "progressive",
    brackets: [
      { upTo: 47500, rate: 0.047 },
      { upTo: Infinity, rate: 0.0565 },
    ],
    standardDeduction: sd(16100, 32200),
  },
  NE: {
    type: "progressive",
    brackets: [
      { upTo: 4130, rate: 0.0246 },
      { upTo: 24760, rate: 0.0351 },
      { upTo: Infinity, rate: 0.0455 },
    ],
    standardDeduction: sd(8850, 17700),
  },
  NV: { type: "none" },
  NH: { type: "none" },
  NJ: {
    type: "progressive",
    brackets: [
      { upTo: 20000, rate: 0.014 },
      { upTo: 35000, rate: 0.0175 },
      { upTo: 40000, rate: 0.035 },
      { upTo: 75000, rate: 0.0553 },
      { upTo: 500000, rate: 0.0637 },
      { upTo: 1000000, rate: 0.0897 },
      { upTo: Infinity, rate: 0.1075 },
    ],
  },
  NM: {
    type: "progressive",
    brackets: [
      { upTo: 5500, rate: 0.015 },
      { upTo: 16500, rate: 0.032 },
      { upTo: 33500, rate: 0.043 },
      { upTo: 66500, rate: 0.047 },
      { upTo: 210000, rate: 0.049 },
      { upTo: Infinity, rate: 0.059 },
    ],
    standardDeduction: sd(16100, 32200),
  },
  NY: {
    type: "progressive",
    brackets: [
      { upTo: 8500, rate: 0.04 },
      { upTo: 11700, rate: 0.045 },
      { upTo: 13900, rate: 0.0525 },
      { upTo: 80650, rate: 0.055 },
      { upTo: 215400, rate: 0.06 },
      { upTo: 1077550, rate: 0.0685 },
      { upTo: 5000000, rate: 0.0965 },
      { upTo: 25000000, rate: 0.103 },
      { upTo: Infinity, rate: 0.109 },
    ],
    // NY State standard deduction (2025, Form IT-201) — verified separately
    standardDeduction: {
      single: 8000,
      married: 16050,
      head: 11200,
    },
  },
  NC: { type: "flat", rate: 0.0399, standardDeduction: sd(12750, 25500) },
  ND: {
    type: "progressive",
    brackets: [
      { upTo: 48475, rate: 0.0 },
      { upTo: 244825, rate: 0.0195 },
      { upTo: Infinity, rate: 0.025 },
    ],
    standardDeduction: sd(16100, 32200),
  },
  OH: {
    type: "progressive",
    brackets: [
      { upTo: 26050, rate: 0.0 },
      { upTo: Infinity, rate: 0.0275 },
    ],
  },
  OK: {
    type: "progressive",
    brackets: [
      { upTo: 3750, rate: 0.0 },
      { upTo: 4900, rate: 0.025 },
      { upTo: 7200, rate: 0.035 },
      { upTo: Infinity, rate: 0.045 },
    ],
    standardDeduction: sd(6350, 12700),
  },
  OR: {
    type: "progressive",
    brackets: [
      { upTo: 4550, rate: 0.0475 },
      { upTo: 11400, rate: 0.0675 },
      { upTo: 125000, rate: 0.0875 },
      { upTo: Infinity, rate: 0.099 },
    ],
    standardDeduction: sd(2910, 5820),
  },
  PA: { type: "flat", rate: 0.0307 },
  RI: {
    type: "progressive",
    brackets: [
      { upTo: 82050, rate: 0.0375 },
      { upTo: 186450, rate: 0.0475 },
      { upTo: Infinity, rate: 0.0599 },
    ],
    standardDeduction: sd(11200, 22400),
  },
  SC: {
    // H.4216 / Act 110 — SCDOR dor.sc.gov/news/information-about-h-4216:
    //   ≤$30k: 1.99%; ≥$30k: "5.21% minus $966" (= income×0.0521 − 966).
    // Bracket-walk below is algebraically identical for income ≥ $30k because
    // 30000×(0.0521−0.0199) = 966. SCIAD replaces federal SD entirely.
    type: "progressive",
    brackets: [
      { upTo: 30000, rate: 0.0199 },
      { upTo: Infinity, rate: 0.0521 },
    ],
    standardDeduction: { single: 15000, married: 30000, head: 22500 },
  },
  SD: { type: "none" },
  TN: { type: "none" },
  TX: { type: "none" },
  UT: {
    // SB 60 (signed Mar 2026), retroactive Jan 1, 2026 — 4.45%; Utah Tax Commission Pub 14
    type: "flat",
    rate: 0.0445,
  },
  VT: {
    type: "progressive",
    brackets: [
      { upTo: 49400, rate: 0.0335 },
      { upTo: 119700, rate: 0.066 },
      { upTo: 249700, rate: 0.076 },
      { upTo: Infinity, rate: 0.0875 },
    ],
    standardDeduction: sd(7650, 15300),
  },
  VA: {
    type: "progressive",
    brackets: [
      { upTo: 3000, rate: 0.02 },
      { upTo: 5000, rate: 0.03 },
      { upTo: 17000, rate: 0.05 },
      { upTo: Infinity, rate: 0.0575 },
    ],
    standardDeduction: sd(8750, 17500),
  },
  WA: { type: "none" },
  WV: {
    type: "progressive",
    brackets: [
      { upTo: 10000, rate: 0.0222 },
      { upTo: 25000, rate: 0.0296 },
      { upTo: 40000, rate: 0.0333 },
      { upTo: 60000, rate: 0.0444 },
      { upTo: Infinity, rate: 0.0482 },
    ],
  },
  WI: {
    type: "progressive",
    brackets: [
      { upTo: 15110, rate: 0.035 },
      { upTo: 51950, rate: 0.044 },
      { upTo: 332720, rate: 0.053 },
      { upTo: Infinity, rate: 0.0765 },
    ],
    standardDeduction: sd(13960, 25840),
  },
  WY: { type: "none" },
};

function calcProgressive(
  income: number,
  brackets: { upTo: number; rate: number }[]
): number {
  if (income <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const { upTo, rate } of brackets) {
    const taxable = Math.min(income, upTo) - prev;
    if (taxable <= 0) break;
    tax += taxable * rate;
    prev = upTo;
  }
  return tax;
}

export function calculateStateTax(
  annualGross: number,
  state: StateCode,
  filingStatus: FilingStatus,
  preTaxDeductions = 0,
  dependents = 0
): number {
  const taxable = getStateTaxableIncome(
    annualGross,
    state,
    filingStatus,
    preTaxDeductions
  );
  const config = STATE_TAX[state];

  if (config.type === "none") return 0;
  if (config.type === "flat") return taxable * config.rate;

  const brackets =
    config.bracketsByStatus?.[filingStatus] ?? config.brackets;
  const tax = calcProgressive(taxable, brackets);

  if (state === "CA") {
    return applyCaExemptionCredits(tax, filingStatus, {
      dependents,
      annualGross: Math.max(0, annualGross - preTaxDeductions),
    });
  }

  return tax;
}

/** Taxable income after state standard deduction (if configured). */
export function getStateTaxableIncome(
  annualGross: number,
  state: StateCode,
  filingStatus: FilingStatus,
  preTaxDeductions = 0
): number {
  const config = STATE_TAX[state];
  const wages = Math.max(0, annualGross - preTaxDeductions);
  if (config.type === "none") return wages;
  if (
    (config.type === "progressive" || config.type === "flat") &&
    config.standardDeduction
  ) {
    const deduction = config.standardDeduction[filingStatus] ?? 0;
    return Math.max(0, wages - deduction);
  }
  return wages;
}

/** Citation for 2026 state table refresh (non-CA/NY). */
export const STATE_TAX_SOURCE_2026 =
  "Tax Foundation, State Income Tax Rates and Brackets 2026 (as of Jan 1, 2026)";

export function hasStateIncomeTax(state: StateCode): boolean {
  return STATE_TAX[state].type !== "none";
}
