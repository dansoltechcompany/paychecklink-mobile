import { calculateFederalWithholding } from "./tax/federal-withholding";
import { calculateFICA } from "./tax/fica";
import { calculateStateTax } from "./tax/state";
import { calculateCaSdi } from "./tax/ca-sdi";
import { calculateLocalTax } from "./tax/local";
import { calculateUkTax } from "./tax/uk";
import { calculateCanadaTax } from "./tax/canada";
import { calculateInternationalTax } from "./tax/international";
import type {
  CalculatorInput,
  CalculatorResult,
  CountryCode,
  PayFrequency,
  TaxBreakdown,
} from "./types";
import { COUNTRIES, PAY_PERIODS } from "./types";

function toAnnual(
  amount: number,
  frequency: PayFrequency,
  payType: "salary" | "hourly",
  hoursPerWeek = 40
): number {
  if (payType === "hourly") {
    return amount * hoursPerWeek * 52;
  }
  return amount * PAY_PERIODS[frequency];
}

function fromAnnual(amount: number, frequency: PayFrequency): number {
  return amount / PAY_PERIODS[frequency];
}

function baseResult(country: CountryCode): CalculatorResult {
  const meta = COUNTRIES[country];
  return {
    country,
    currency: meta.currency,
    currencySymbol: meta.currencySymbol,
    grossPay: 0,
    grossAnnual: 0,
    federalTax: 0,
    stateTax: 0,
    localTax: 0,
    socialSecurity: 0,
    medicare: 0,
    stateDisability: 0,
    preTaxDeductions: 0,
    postTaxDeductions: 0,
    totalTaxes: 0,
    netPay: 0,
    netAnnual: 0,
    effectiveTaxRate: 0,
    breakdown: [],
    accuracyNotes: [],
  };
}

export function calculatePaycheck(input: CalculatorInput): CalculatorResult {
  const {
    country = "US",
    payType,
    grossAmount,
    payFrequency,
    hoursPerWeek = 40,
    overtimeHours = 0,
    overtimeMultiplier = 1.5,
    filingStatus,
    state = "CA",
    province = "ON",
    ukNation = "england",
    preTax401k = 0,
    preTax401kPercent = 0,
    preTaxBenefits = 0,
    preTaxBenefitsPercent = 0,
    postTaxDeductions = 0,
    bonusAmount = 0,
    bonusSupplemental = true,
    w4Step2 = false,
    w4DependentsCredit = 0,
    w4OtherIncome = 0,
    w4Deductions = 0,
    w4ExtraWithholding = 0,
    zip,
    localTaxRate,
    dependents = 0,
  } = input;

  const meta = COUNTRIES[country];
  const periods = PAY_PERIODS[payFrequency];

  let periodGross = grossAmount;
  if (payType === "hourly") {
    const regular = grossAmount * hoursPerWeek;
    const overtime = grossAmount * overtimeMultiplier * overtimeHours;
    // Hourly entry is rate; convert to period using frequency ≈ hours in period
    const weeksPerPeriod = 52 / periods;
    periodGross = (regular + overtime) * weeksPerPeriod;
  }

  const bonusPerPeriod = bonusAmount;
  const grossAnnual =
    periodGross * periods + bonusPerPeriod * periods;

  if (grossAnnual <= 0) return baseResult(country);

  const preTax401kAnnual =
    preTax401k > 0
      ? preTax401k * periods
      : grossAnnual * (preTax401kPercent / 100);

  const preTaxBenefitsAnnual =
    preTaxBenefits > 0
      ? preTaxBenefits * periods
      : grossAnnual * (preTaxBenefitsPercent / 100);

  const preTaxTotalAnnual = preTax401kAnnual + preTaxBenefitsAnnual;
  const postTaxAnnual = postTaxDeductions * periods;

  // FIT wages: exclude traditional 401k + section 125 benefits
  const fitWagesAnnual = Math.max(0, grossAnnual - preTaxTotalAnnual);
  // FICA wages: exclude section 125 only (401k still subject to FICA)
  const ficaWagesAnnual = Math.max(0, grossAnnual - preTaxBenefitsAnnual);

  let incomeTaxAnnual = 0;
  let regionalTaxAnnual = 0;
  let localTaxAnnual = 0;
  let socialAnnual = 0;
  let otherAnnual = 0;
  let disabilityAnnual = 0;
  let breakdownAnnual: { label: string; amount: number }[] = [];
  const accuracyNotes: string[] = [];

  if (country === "US") {
    const fitWagesPerPeriod = fitWagesAnnual / periods;
    const federal = calculateFederalWithholding({
      wagesPerPeriod: Math.max(
        0,
        fitWagesPerPeriod - (bonusSupplemental ? bonusPerPeriod : 0)
      ),
      payFrequency,
      filingStatus,
      w4Step2,
      w4DependentsCredit,
      w4OtherIncome,
      w4Deductions,
      w4ExtraWithholding,
      supplementalBonus: bonusSupplemental ? bonusPerPeriod : 0,
      useSupplementalRate: bonusSupplemental && bonusPerPeriod > 0,
    });

    incomeTaxAnnual = federal.annualized;
    regionalTaxAnnual = calculateStateTax(
      fitWagesAnnual,
      state,
      filingStatus,
      0,
      dependents
    );

    const local = calculateLocalTax(fitWagesAnnual, {
      zip,
      customRate: localTaxRate,
      filingStatus,
      state,
    });
    localTaxAnnual = local.annual;

    const fica = calculateFICA(ficaWagesAnnual, {
      married: filingStatus === "married",
    });
    socialAnnual = fica.socialSecurity;
    otherAnnual = fica.medicare;
    const medicareBaseAnnual = fica.medicareBase;
    const additionalMedicareAnnual = fica.additionalMedicare;

    if (state === "CA") {
      // SDI applies to CA wages; Section 125 benefits typically reduce SDI wages
      disabilityAnnual = calculateCaSdi(ficaWagesAnnual);
    }

    breakdownAnnual = [
      { label: "Federal income tax (Pub 15-T)", amount: incomeTaxAnnual },
      { label: "State income tax", amount: regionalTaxAnnual },
    ];
    if (localTaxAnnual > 0) {
      breakdownAnnual.push({ label: local.label, amount: localTaxAnnual });
    }
    breakdownAnnual.push(
      { label: "Social Security (6.2%)", amount: socialAnnual },
      { label: "Medicare (1.45%)", amount: medicareBaseAnnual }
    );
    if (additionalMedicareAnnual > 0) {
      breakdownAnnual.push({
        label: "Additional Medicare (0.9%)",
        amount: additionalMedicareAnnual,
      });
    }
    if (disabilityAnnual > 0) {
      breakdownAnnual.push({
        label: "CA SDI (1.3%)",
        amount: disabilityAnnual,
      });
    }

    accuracyNotes.push(
      "Federal withholding uses IRS Publication 15-T percentage method (W-4 compatible)."
    );
    accuracyNotes.push(
      "FICA: 401(k) reduces federal income tax only; Section 125 benefits reduce FIT and FICA. Social Security is capped at the annual wage base; Additional Medicare Tax applies above the IRS threshold."
    );
    accuracyNotes.push(
      "Estimates use one work/tax state. Multi-state reciprocity and nonresident withholding are not modeled."
    );
    if (state === "CA") {
      accuracyNotes.push(
        "California state tax uses FTB Schedule X/Y/Z, the CA standard deduction, and Form 540 personal exemption credits ($153 single/HOH; $306 married), with the official AGI limitation phase-out."
      );
      accuracyNotes.push(
        "CA SDI uses the EDD employee rate (1.3% for 2026, no wage cap). Full EDD DE 4 wage-bracket tables are not modeled."
      );
    }
    if (state === "NY") {
      accuracyNotes.push(
        "New York state tax uses NY brackets with the NY standard deduction (2025 amounts)."
      );
      if (zip && localTaxAnnual > 0) {
        accuracyNotes.push(
          "NYC resident tax uses the IT-201 progressive schedule on NY taxable income (same base as state tax)."
        );
      }
    }
    if (state === "MD") {
      accuracyNotes.push(
        "Maryland state tax uses Comptroller brackets with the MD standard deduction. Local county/city income tax is mandatory (2.25%–3.30%); enter a Maryland ZIP for your county, otherwise 3.20% default applies."
      );
    }
    if (state === "PA") {
      accuracyNotes.push(
        "Pennsylvania state tax is a flat 3.07% (no standard deduction). Local Earned Income Tax (EIT) varies by municipality/school district (~2,500 jurisdictions) — only Philadelphia/Pittsburgh samples are mapped; enter a custom local % for other PA localities."
      );
    }
    if (state === "OH") {
      accuracyNotes.push(
        "Ohio state tax uses the 2026 structure (0% to $26,050; 2.75% above). Municipal income tax (RITA/cities) is only sampled for Cincinnati/Columbus/Cleveland — enter a custom local % for other Ohio cities."
      );
    }
    if (state === "KY") {
      accuracyNotes.push(
        "Kentucky state tax is a flat 3.5% (2026) after the KY standard deduction. County occupational license taxes are not fully mapped (Louisville sample only) — enter a custom local % when applicable."
      );
    }
    if (bonusSupplemental && bonusPerPeriod > 0) {
      accuracyNotes.push(
        "Bonus uses IRS supplemental flat withholding rate (22%)."
      );
    }
    if (localTaxAnnual > 0) {
      accuracyNotes.push(`Local tax applied: ${local.label}.`);
    } else if (zip) {
      accuracyNotes.push(
        "ZIP entered but no local employee income tax mapped — add a custom local rate if needed."
      );
    }
    accuracyNotes.push(
      "State tax uses current state rate tables (estimate). Actual employer withholding tables may differ slightly."
    );
  } else if (country === "UK") {
    const uk = calculateUkTax(fitWagesAnnual, ukNation);
    incomeTaxAnnual = uk.incomeTax;
    socialAnnual = uk.nationalInsurance;
    breakdownAnnual = [
      { label: "Income Tax", amount: incomeTaxAnnual },
      { label: "National Insurance", amount: socialAnnual },
    ];
    accuracyNotes.push(
      ukNation === "scotland"
        ? "UK estimates use Scottish Income Tax bands + Class 1 National Insurance."
        : "UK estimates use PAYE-style Income Tax + Class 1 NI (England/Wales/NI bands)."
    );
    if (fitWagesAnnual > 100000) {
      accuracyNotes.push(
        "Personal Allowance is tapered for income above £100,000."
      );
    }
  } else if (country === "CA") {
    const ca = calculateCanadaTax(fitWagesAnnual, province);
    incomeTaxAnnual = ca.federalTax;
    regionalTaxAnnual = ca.provincialTax;
    socialAnnual = ca.cpp;
    otherAnnual = ca.ei;
    const pensionLabel = province === "QC" ? "QPP" : "CPP";
    breakdownAnnual = [
      { label: "Federal Income Tax", amount: incomeTaxAnnual },
      { label: "Provincial Tax", amount: regionalTaxAnnual },
      { label: pensionLabel, amount: socialAnnual },
      { label: "EI", amount: otherAnnual },
    ];
    accuracyNotes.push(
      province === "QC"
        ? "Canada (Quebec) estimates use federal + Quebec provincial tax with QPP and Quebec EI rates (2026 CRA). QPIP and Ontario-style surtax omitted."
        : "Canada estimates use 2026 CRA federal brackets + provincial rates with CPP/EI employee contributions. BPA simplified as a deduction; provincial surtaxes/health premiums omitted."
    );
  } else {
    const intl = calculateInternationalTax(country, fitWagesAnnual);
    incomeTaxAnnual = intl.incomeTax;
    socialAnnual = intl.social;
    otherAnnual = intl.other;
    breakdownAnnual = [
      { label: intl.labels.incomeTax, amount: incomeTaxAnnual },
    ];
    if (intl.social > 0 || intl.labels.social !== "—") {
      breakdownAnnual.push({ label: intl.labels.social, amount: socialAnnual });
    }
    if (intl.other > 0 && intl.labels.other) {
      breakdownAnnual.push({ label: intl.labels.other, amount: otherAnnual });
    }
    accuracyNotes.push(
      `${meta.name} uses a simplified official-table engine for take-home estimates.`
    );
  }

  const totalTaxesAnnual =
    incomeTaxAnnual +
    regionalTaxAnnual +
    localTaxAnnual +
    socialAnnual +
    otherAnnual +
    disabilityAnnual;

  const netAnnual =
    grossAnnual - preTaxTotalAnnual - totalTaxesAnnual - postTaxAnnual;

  const grossPay = fromAnnual(grossAnnual, payFrequency);
  const preTaxDeductions = fromAnnual(preTaxTotalAnnual, payFrequency);
  const postTaxPerPeriod = fromAnnual(postTaxAnnual, payFrequency);
  const federalTax = fromAnnual(incomeTaxAnnual, payFrequency);
  const stateTax = fromAnnual(regionalTaxAnnual, payFrequency);
  const localTax = fromAnnual(localTaxAnnual, payFrequency);
  const socialSecurity = fromAnnual(socialAnnual, payFrequency);
  const medicare = fromAnnual(otherAnnual, payFrequency);
  const stateDisability = fromAnnual(disabilityAnnual, payFrequency);
  const totalTaxes = fromAnnual(totalTaxesAnnual, payFrequency);
  const netPay = fromAnnual(netAnnual, payFrequency);

  const breakdown: TaxBreakdown[] = breakdownAnnual.map((item) => ({
    label: item.label,
    amount: fromAnnual(item.amount, payFrequency),
    annualAmount: item.amount,
  }));

  if (preTaxDeductions > 0) {
    breakdown.unshift({
      label:
        country === "US"
          ? "Pre-tax deductions (401k / benefits)"
          : "Pre-tax deductions",
      amount: -preTaxDeductions,
      annualAmount: -preTaxTotalAnnual,
    });
  }
  if (postTaxPerPeriod > 0) {
    breakdown.push({
      label: "Post-tax deductions",
      amount: -postTaxPerPeriod,
      annualAmount: -postTaxAnnual,
    });
  }

  return {
    country,
    currency: meta.currency,
    currencySymbol: meta.currencySymbol,
    grossPay,
    grossAnnual,
    federalTax,
    stateTax,
    localTax,
    socialSecurity,
    medicare,
    stateDisability,
    preTaxDeductions,
    postTaxDeductions: postTaxPerPeriod,
    totalTaxes,
    netPay,
    netAnnual,
    effectiveTaxRate:
      grossAnnual > 0 ? (totalTaxesAnnual / grossAnnual) * 100 : 0,
    breakdown,
    accuracyNotes,
  };
}

export function hourlyToSalary(hourly: number, hoursPerWeek = 40): number {
  return hourly * hoursPerWeek * 52;
}

export function salaryToHourly(annual: number, hoursPerWeek = 40): number {
  return annual / (hoursPerWeek * 52);
}
