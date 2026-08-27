import type { FilingStatus } from "../types";

/**
 * California Form 540 exemption tax credits (2025 FTB indexed amounts)
 * + AGI Limitation Worksheet phase-out from 2025 Form 540 instructions.
 * Source: https://www.ftb.ca.gov/forms/2025/2025-540-instructions.html
 */
export const CA_EXEMPTION_CREDITS_2025 = {
  personalSingleOrHead: 153,
  personalMarried: 306,
  dependent: 475,
  /** AGI Limitation Worksheet — Form 540 line 32 */
  phaseOutStart: {
    single: 252203,
    married: 504411,
    head: 378310,
  } as Record<FilingStatus, number>,
  /** Divisor for excess AGI (married filing separately would be $1,250; we map MFS→single) */
  phaseOutStep: 2500,
  /** Dollar reduction per exemption count per step */
  phaseOutPerStep: 6,
} as const;

export function getCaPersonalExemptionCredit(
  filingStatus: FilingStatus
): number {
  return filingStatus === "married"
    ? CA_EXEMPTION_CREDITS_2025.personalMarried
    : CA_EXEMPTION_CREDITS_2025.personalSingleOrHead;
}

/** Number of personal exemption "boxes" on Form 540 lines 7–9 (we model personal only). */
function personalExemptionCount(filingStatus: FilingStatus): number {
  return filingStatus === "married" ? 2 : 1;
}

/**
 * FTB AGI Limitation Worksheet lines c–e:
 * excess AGI ÷ $2,500, round up, × $6.
 */
export function caPhaseOutReductionPerExemption(
  annualGross: number,
  filingStatus: FilingStatus
): number {
  const threshold = CA_EXEMPTION_CREDITS_2025.phaseOutStart[filingStatus];
  const excess = annualGross - threshold;
  if (excess <= 0) return 0;

  const steps = Math.ceil(excess / CA_EXEMPTION_CREDITS_2025.phaseOutStep);
  return steps * CA_EXEMPTION_CREDITS_2025.phaseOutPerStep;
}

export function getCaExemptionCredits(
  filingStatus: FilingStatus,
  dependents = 0,
  annualGross = 0
): number {
  const personalDollars = getCaPersonalExemptionCredit(filingStatus);
  const depCount = Math.max(0, Math.floor(dependents));
  const dependentDollars = depCount * CA_EXEMPTION_CREDITS_2025.dependent;

  const perExemptionCut = caPhaseOutReductionPerExemption(
    annualGross,
    filingStatus
  );

  if (perExemptionCut <= 0) {
    return personalDollars + dependentDollars;
  }

  // Worksheet: reduce personal boxes and dependent boxes separately
  const personalReduced = Math.max(
    0,
    personalDollars - personalExemptionCount(filingStatus) * perExemptionCut
  );
  const dependentReduced = Math.max(
    0,
    dependentDollars - depCount * perExemptionCut
  );

  return personalReduced + dependentReduced;
}

/** Apply CA exemption credits to computed Schedule X/Y/Z tax. */
export function applyCaExemptionCredits(
  taxBeforeCredits: number,
  filingStatus: FilingStatus,
  options?: { dependents?: number; annualGross?: number }
): number {
  const credits = getCaExemptionCredits(
    filingStatus,
    options?.dependents ?? 0,
    options?.annualGross ?? 0
  );
  return Math.max(0, taxBeforeCredits - credits);
}
