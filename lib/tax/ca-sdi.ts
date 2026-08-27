/**
 * California State Disability Insurance (SDI) / Paid Family Leave employee withholding.
 * Source: EDD — 1.3% for 2026, no wage base (SB 951 removed the cap).
 */
export const CA_SDI_2026 = {
  rate: 0.013,
  wageBase: Infinity,
  source: "EDD California — SDI withholding rate effective Jan 1, 2026",
} as const;

export function calculateCaSdi(wagesAnnual: number): number {
  if (wagesAnnual <= 0) return 0;
  return wagesAnnual * CA_SDI_2026.rate;
}
