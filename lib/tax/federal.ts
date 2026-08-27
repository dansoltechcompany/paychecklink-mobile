import type { FilingStatus } from "../types";

/** 2026 federal income tax brackets (estimated; update annually) */
const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 16100,
  married: 32200,
  head: 24150,
};

const BRACKETS: Record<FilingStatus, { upTo: number; rate: number }[]> = {
  single: [
    { upTo: 11925, rate: 0.1 },
    { upTo: 48475, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250525, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  married: [
    { upTo: 23850, rate: 0.1 },
    { upTo: 96950, rate: 0.12 },
    { upTo: 206700, rate: 0.22 },
    { upTo: 394600, rate: 0.24 },
    { upTo: 501050, rate: 0.32 },
    { upTo: 751600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  head: [
    { upTo: 17000, rate: 0.1 },
    { upTo: 64850, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250500, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
};

function calcProgressiveTax(
  taxableIncome: number,
  brackets: { upTo: number; rate: number }[]
): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const { upTo, rate } of brackets) {
    const taxable = Math.min(taxableIncome, upTo) - prev;
    if (taxable <= 0) break;
    tax += taxable * rate;
    prev = upTo;
  }
  return tax;
}

export function calculateFederalTax(
  annualGross: number,
  filingStatus: FilingStatus,
  preTaxDeductions = 0
): number {
  const taxable =
    Math.max(0, annualGross - preTaxDeductions - STANDARD_DEDUCTION[filingStatus]);
  return calcProgressiveTax(taxable, BRACKETS[filingStatus]);
}

export function getStandardDeduction(filingStatus: FilingStatus): number {
  return STANDARD_DEDUCTION[filingStatus];
}
