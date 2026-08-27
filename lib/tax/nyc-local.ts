import type { FilingStatus } from "../types";

type Bracket = { upTo: number; rate: number };

/**
 * NYC resident income tax — IT-201 rate schedules (2025).
 * Applied to NY State taxable income (same base as NY state tax after standard deduction).
 * Source: NY Form IT-201 instructions, NYC tax rate schedule.
 */
const NYC_BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    { upTo: 12000, rate: 0.03078 },
    { upTo: 25000, rate: 0.03762 },
    { upTo: 50000, rate: 0.03819 },
    { upTo: Infinity, rate: 0.03876 },
  ],
  married: [
    { upTo: 21600, rate: 0.03078 },
    { upTo: 45000, rate: 0.03762 },
    { upTo: 90000, rate: 0.03819 },
    { upTo: Infinity, rate: 0.03876 },
  ],
  head: [
    { upTo: 14400, rate: 0.03078 },
    { upTo: 30000, rate: 0.03762 },
    { upTo: 60000, rate: 0.03819 },
    { upTo: Infinity, rate: 0.03876 },
  ],
};

function calcProgressive(income: number, brackets: Bracket[]): number {
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

export function calculateNycLocalTax(
  nyTaxableIncome: number,
  filingStatus: FilingStatus
): number {
  return calcProgressive(nyTaxableIncome, NYC_BRACKETS[filingStatus]);
}

/** NYC resident ZIP prefixes (Manhattan, Bronx, Brooklyn, Queens). */
const NYC_ZIP_PREFIXES = ["100", "101", "102", "103", "104", "110", "111", "112", "113", "114", "116"];

export function isNycZip(zip: string): boolean {
  const normalized = zip.trim().slice(0, 5);
  if (!/^\d{5}$/.test(normalized)) return false;
  return NYC_ZIP_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export const NYC_LOCAL_TAX_SOURCE =
  "NYC Department of Finance / NY IT-201 NYC resident tax rate schedule (2025)";
