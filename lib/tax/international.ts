import type { CountryCode } from "../types";

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

type IntlResult = {
  incomeTax: number;
  social: number;
  other: number;
  labels: { incomeTax: string; social: string; other?: string };
};

export const EUROPE_TAX_SOURCE =
  "DE 2026 Grundfreibetrag + BBG social; IE Revenue 2026 bands/USC/PRSI; NL Belastingdienst Box 1 2026";

function irelandUsc(annualGross: number): number {
  if (annualGross <= 13000) return 0;
  let usc = Math.min(annualGross, 12012) * 0.005;
  if (annualGross > 12012) {
    usc += Math.min(annualGross - 12012, 28700 - 12012) * 0.02;
  }
  if (annualGross > 28700) {
    usc += Math.min(annualGross - 28700, 70044 - 28700) * 0.03;
  }
  if (annualGross > 70044) {
    usc += (annualGross - 70044) * 0.08;
  }
  return usc;
}

function germanyEmployeeSocial(annualGross: number): number {
  // Employee shares 2026 (avg health Zusatzbeitrag 1.45%); care assumes with children (1.8%)
  const pensionUnemp = Math.min(annualGross, 101400) * (0.093 + 0.013);
  const healthCare =
    Math.min(annualGross, 69750) * (0.073 + 0.0145 + 0.018);
  return pensionUnemp + healthCare;
}

/** Simplified Tier-1 country engines for take-home estimates */
export function calculateInternationalTax(
  country: Exclude<CountryCode, "US" | "UK" | "CA">,
  annualGross: number
): IntlResult {
  switch (country) {
    case "AU": {
      // Australian resident tax + Medicare levy (simplified)
      const incomeTax = progressive(annualGross, [
        { upTo: 18200, rate: 0 },
        { upTo: 45000, rate: 0.16 },
        { upTo: 135000, rate: 0.3 },
        { upTo: 190000, rate: 0.37 },
        { upTo: Infinity, rate: 0.45 },
      ]);
      const medicare = annualGross * 0.02;
      return {
        incomeTax,
        social: medicare,
        other: 0,
        labels: { incomeTax: "Income Tax", social: "Medicare Levy" },
      };
    }
    case "IE": {
      // Revenue.ie 2026 — single standard-rate band + personal+PAYE credits
      const standardRateBand = 44000;
      const rawTax =
        Math.min(annualGross, standardRateBand) * 0.2 +
        Math.max(0, annualGross - standardRateBand) * 0.4;
      const taxCredits = 2000 + 2000; // personal + employee PAYE
      const incomeTax = Math.max(0, rawTax - taxCredits);
      const usc = irelandUsc(annualGross);
      const prsi = annualGross * 0.042; // Class A Jan–Sep 2026 rate (simplified full-year)
      return {
        incomeTax,
        social: usc + prsi,
        other: 0,
        labels: { incomeTax: "Income Tax", social: "USC + PRSI" },
      };
    }
    case "DE": {
      // Simplified zone model (real Lohnsteuer is a continuous formula) + 2026 social BBGs
      const incomeTax = progressive(annualGross, [
        { upTo: 12348, rate: 0 },
        { upTo: 17430, rate: 0.14 },
        { upTo: 69878, rate: 0.24 },
        { upTo: 277826, rate: 0.42 },
        { upTo: Infinity, rate: 0.45 },
      ]);
      const social = germanyEmployeeSocial(annualGross);
      // Solidaritätszuschlag largely phased out for typical earners
      const soli = annualGross > 80000 ? incomeTax * 0.055 : 0;
      return {
        incomeTax,
        social,
        other: soli,
        labels: {
          incomeTax: "Income Tax",
          social: "Social Contributions",
          other: "Solidarity Surcharge",
        },
      };
    }
    case "NL": {
      // Belastingdienst Box 1 2026 (under AOW age) — before heffingskortingen
      const incomeTax = progressive(annualGross, [
        { upTo: 38883, rate: 0.3575 },
        { upTo: 78426, rate: 0.3756 },
        { upTo: Infinity, rate: 0.495 },
      ]);
      return {
        incomeTax,
        social: 0,
        other: 0,
        labels: {
          incomeTax: "Box 1 Tax (incl. national insurance)",
          social: "—",
        },
      };
    }
    case "FR": {
      const incomeTax = progressive(annualGross, [
        { upTo: 11294, rate: 0 },
        { upTo: 28797, rate: 0.11 },
        { upTo: 82341, rate: 0.3 },
        { upTo: 177106, rate: 0.41 },
        { upTo: Infinity, rate: 0.45 },
      ]);
      const social = annualGross * 0.097;
      return {
        incomeTax,
        social,
        other: 0,
        labels: { incomeTax: "Income Tax", social: "Social Charges (CSG/CRDS approx.)" },
      };
    }
    case "ES": {
      const incomeTax = progressive(annualGross, [
        { upTo: 12450, rate: 0.19 },
        { upTo: 20200, rate: 0.24 },
        { upTo: 35200, rate: 0.3 },
        { upTo: 60000, rate: 0.37 },
        { upTo: 300000, rate: 0.45 },
        { upTo: Infinity, rate: 0.47 },
      ]);
      const social = Math.min(annualGross, 56000) * 0.064;
      return {
        incomeTax,
        social,
        other: 0,
        labels: { incomeTax: "IRPF", social: "Social Security (employee)" },
      };
    }
    case "IT": {
      const incomeTax = progressive(annualGross, [
        { upTo: 28000, rate: 0.23 },
        { upTo: 50000, rate: 0.35 },
        { upTo: Infinity, rate: 0.43 },
      ]);
      const social = annualGross * 0.0919;
      return {
        incomeTax,
        social,
        other: 0,
        labels: { incomeTax: "IRPEF", social: "INPS Contributions" },
      };
    }
    case "SE": {
      const municipal = annualGross * 0.32;
      const national =
        annualGross > 598500 ? (annualGross - 598500) * 0.2 : 0;
      return {
        incomeTax: municipal + national,
        social: 0,
        other: 0,
        labels: { incomeTax: "Municipal + National Tax", social: "—" },
      };
    }
    case "CH": {
      // Rough federal + average cantonal/communal blend
      const federal = progressive(annualGross, [
        { upTo: 15200, rate: 0 },
        { upTo: 31600, rate: 0.01 },
        { upTo: 80000, rate: 0.05 },
        { upTo: 150000, rate: 0.09 },
        { upTo: Infinity, rate: 0.13 },
      ]);
      const cantonal = annualGross * 0.1;
      const social = annualGross * 0.064;
      return {
        incomeTax: federal + cantonal,
        social,
        other: 0,
        labels: {
          incomeTax: "Federal + Cantonal Tax (avg.)",
          social: "AHV/IV/EO + ALV",
        },
      };
    }
  }
}
