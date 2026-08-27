import type { FilingStatus, StateCode } from "../types";
import { calculateNycLocalTax, isNycZip } from "./nyc-local";
import {
  defaultMdLocal,
  lookupMdLocalByZip,
  MD_LOCAL_SOURCE,
} from "./md-local";
import { getStateTaxableIncome } from "./state";

/**
 * Local / city income tax estimates for common US payroll localities.
 * ZIP → rate mapping for high-traffic metros. Users can also enter a custom rate.
 *
 * Maryland: every resident owes county/city local income tax (Comptroller 2026).
 * Pennsylvania EIT / Ohio RITA / Kentucky occupational: only sample cities —
 * full municipal maps are not feasible (see methodology).
 */

export interface LocalTaxInfo {
  name: string;
  rate: number;
  state: StateCode;
  note?: string;
}

/** Representative ZIPs for major local income-tax cities (non-NYC, non-MD-county) */
export const LOCAL_TAX_BY_ZIP: Record<string, LocalTaxInfo> = {
  // Philadelphia wage tax
  "19103": {
    name: "Philadelphia, PA",
    rate: 0.0375,
    state: "PA",
    note: "City wage tax (resident approx.) — PA EIT elsewhere not mapped",
  },
  "19107": { name: "Philadelphia, PA", rate: 0.0375, state: "PA" },
  "19146": { name: "Philadelphia, PA", rate: 0.0375, state: "PA" },
  // Detroit
  "48201": { name: "Detroit, MI", rate: 0.024, state: "MI" },
  "48226": { name: "Detroit, MI", rate: 0.024, state: "MI" },
  // San Francisco
  "94102": {
    name: "San Francisco, CA",
    rate: 0,
    state: "CA",
    note: "No employee city income tax; CA state still applies",
  },
  "94103": { name: "San Francisco, CA", rate: 0, state: "CA" },
  // Denver
  "80202": {
    name: "Denver, CO",
    rate: 0.0,
    state: "CO",
    note: "OPT is nominal; enter custom if needed",
  },
  // Portland Metro / Multnomah
  "97201": {
    name: "Portland / Multnomah, OR",
    rate: 0.02,
    state: "OR",
    note: "Metro + Multnomah support approx.",
  },
  "97209": { name: "Portland / Multnomah, OR", rate: 0.02, state: "OR" },
  // St. Louis / Kansas City earnings taxes
  "63101": { name: "St. Louis, MO", rate: 0.01, state: "MO" },
  "64101": { name: "Kansas City, MO", rate: 0.01, state: "MO" },
  // Ohio municipal (RITA / city — sample only)
  "45202": {
    name: "Cincinnati, OH",
    rate: 0.018,
    state: "OH",
    note: "Sample municipal; full Ohio RITA map not modeled",
  },
  "43215": {
    name: "Columbus, OH",
    rate: 0.025,
    state: "OH",
    note: "Sample municipal; full Ohio RITA map not modeled",
  },
  "44113": {
    name: "Cleveland, OH",
    rate: 0.025,
    state: "OH",
    note: "Sample municipal; full Ohio RITA map not modeled",
  },
  // Pittsburgh
  "15222": {
    name: "Pittsburgh, PA",
    rate: 0.03,
    state: "PA",
    note: "Earned income + local approx. — PA has 2,500+ EIT jurisdictions",
  },
  // Wilmington DE
  "19801": { name: "Wilmington, DE", rate: 0.0125, state: "DE" },
  // Birmingham AL occupational
  "35203": { name: "Birmingham, AL", rate: 0.01, state: "AL" },
  // Louisville KY occupational (sample — county rates vary)
  "40202": {
    name: "Louisville, KY",
    rate: 0.022,
    state: "KY",
    note: "Occupational license tax sample; KY county rates not fully mapped",
  },
  // Newark NJ
  "07102": { name: "Newark, NJ", rate: 0.01, state: "NJ" },
};

export function lookupLocalTax(zip: string): LocalTaxInfo | null {
  const normalized = zip.trim().slice(0, 5);
  if (!/^\d{5}$/.test(normalized)) return null;
  if (isNycZip(normalized)) {
    return {
      name: "New York City, NY",
      rate: 0,
      state: "NY",
      note: "NYC resident tax (progressive schedule on NY taxable income)",
    };
  }
  const md = lookupMdLocalByZip(normalized);
  if (md) {
    return {
      name: md.county + ", MD",
      rate: md.rate,
      state: "MD",
      note: md.note ?? "Maryland local income tax (Comptroller 2026)",
    };
  }
  return LOCAL_TAX_BY_ZIP[normalized] ?? null;
}

export function calculateLocalTax(
  annualTaxableWages: number,
  options: {
    zip?: string;
    customRate?: number;
    filingStatus?: FilingStatus;
    state?: StateCode;
  }
): { annual: number; rate: number; label: string } {
  if (options.customRate != null && options.customRate > 0) {
    return {
      annual: annualTaxableWages * options.customRate,
      rate: options.customRate,
      label: `Local tax (${(options.customRate * 100).toFixed(2)}%)`,
    };
  }

  // Maryland: mandatory county/city local on MD taxable income
  if (options.state === "MD" && options.filingStatus) {
    const mdTaxable = getStateTaxableIncome(
      annualTaxableWages,
      "MD",
      options.filingStatus,
      0
    );
    const mdInfo = options.zip
      ? lookupMdLocalByZip(options.zip) ?? defaultMdLocal()
      : defaultMdLocal();
    const annual = mdTaxable * mdInfo.rate;
    return {
      annual,
      rate: mdInfo.rate,
      label: `MD local — ${mdInfo.county}${mdInfo.note ? ` (${mdInfo.note})` : ""}`,
    };
  }

  if (options.zip) {
    const info = lookupLocalTax(options.zip);
    if (
      info &&
      options.state === "NY" &&
      options.filingStatus &&
      isNycZip(options.zip)
    ) {
      const nyTaxable = getStateTaxableIncome(
        annualTaxableWages,
        "NY",
        options.filingStatus,
        0
      );
      const annual = calculateNycLocalTax(nyTaxable, options.filingStatus);
      return {
        annual,
        rate: nyTaxable > 0 ? annual / nyTaxable : 0,
        label: "NYC resident tax — New York City, NY",
      };
    }
    if (info && info.rate > 0) {
      return {
        annual: annualTaxableWages * info.rate,
        rate: info.rate,
        label: `Local tax — ${info.name}`,
      };
    }
    if (info && info.rate === 0) {
      return { annual: 0, rate: 0, label: info.note || info.name };
    }
  }
  return { annual: 0, rate: 0, label: "Local tax" };
}

export const LOCAL_TAX_SOURCE =
  "City/county published earned-income or local income tax rates for common ZIPs (approximate; verify locally). Maryland: " +
  MD_LOCAL_SOURCE;
