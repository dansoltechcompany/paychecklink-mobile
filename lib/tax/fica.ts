/** 2026 FICA — Social Security & Medicare employee withholding */

export const FICA_2026 = {
  socialSecurityRate: 0.062,
  socialSecurityWageBase: 176100,
  medicareRate: 0.0145,
  additionalMedicareRate: 0.009,
  /** Additional Medicare threshold for single / default employee withholding */
  additionalMedicareThresholdSingle: 200000,
  additionalMedicareThresholdMarried: 250000,
} as const;

export function calculateSocialSecurity(ficaWagesAnnual: number): number {
  return (
    Math.min(ficaWagesAnnual, FICA_2026.socialSecurityWageBase) *
    FICA_2026.socialSecurityRate
  );
}

export function calculateMedicare(
  ficaWagesAnnual: number,
  married = false
): { base: number; additional: number; total: number } {
  const base = ficaWagesAnnual * FICA_2026.medicareRate;
  const threshold = married
    ? FICA_2026.additionalMedicareThresholdMarried
    : FICA_2026.additionalMedicareThresholdSingle;
  const additional =
    ficaWagesAnnual > threshold
      ? (ficaWagesAnnual - threshold) * FICA_2026.additionalMedicareRate
      : 0;
  return { base, additional, total: base + additional };
}

export function calculateFICA(
  ficaWagesAnnual: number,
  options?: { married?: boolean }
): {
  socialSecurity: number;
  medicare: number;
  medicareBase: number;
  additionalMedicare: number;
} {
  const medicare = calculateMedicare(ficaWagesAnnual, options?.married);
  return {
    socialSecurity: calculateSocialSecurity(ficaWagesAnnual),
    medicare: medicare.total,
    medicareBase: medicare.base,
    additionalMedicare: medicare.additional,
  };
}

export const FICA_SOURCE =
  "IRS / SSA — Social Security wage base & Medicare rates for 2026";
