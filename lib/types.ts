export type PayFrequency =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "annual";

export type PayType = "salary" | "hourly";

export type FilingStatus = "single" | "married" | "head";

export type CountryCode =
  | "US"
  | "UK"
  | "CA"
  | "AU"
  | "IE"
  | "DE"
  | "NL"
  | "FR"
  | "ES"
  | "IT"
  | "SE"
  | "CH";

export type StateCode =
  | "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA"
  | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD"
  | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ"
  | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC"
  | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY";

export type ProvinceCode =
  | "AB" | "BC" | "MB" | "NB" | "NL" | "NS" | "NT" | "NU"
  | "ON" | "PE" | "QC" | "SK" | "YT";

export type UkNation = "england" | "scotland" | "wales" | "ni";

export interface CalculatorInput {
  country: CountryCode;
  payType: PayType;
  grossAmount: number;
  payFrequency: PayFrequency;
  hoursPerWeek?: number;
  overtimeHours?: number;
  overtimeMultiplier?: number;
  filingStatus: FilingStatus;
  state?: StateCode;
  province?: ProvinceCode;
  ukNation?: UkNation;
  /** Traditional 401(k) % of gross — reduces FIT, not FICA */
  preTax401k?: number;
  preTax401kPercent?: number;
  /** Section 125 / HSA / FSA style — reduces FIT and FICA */
  preTaxBenefits?: number;
  preTaxBenefitsPercent?: number;
  /** Post-tax deductions (Roth, garnishments, etc.) — reduce net only */
  postTaxDeductions?: number;
  bonusAmount?: number;
  /** Use IRS supplemental flat rate (22%) for bonus */
  bonusSupplemental?: boolean;
  /** Form W-4 Step 2(c) */
  w4Step2?: boolean;
  /** Form W-4 Step 3 annual dependents credit ($) */
  w4DependentsCredit?: number;
  /** Form W-4 Step 4(a) other income annual */
  w4OtherIncome?: number;
  /** Form W-4 Step 4(b) deductions annual */
  w4Deductions?: number;
  /** Form W-4 Step 4(c) extra withholding per period */
  w4ExtraWithholding?: number;
  /** ZIP for local tax lookup */
  zip?: string;
  /** Override local tax rate (0.01 = 1%) */
  localTaxRate?: number;
  dependents?: number;
}

export interface TaxBreakdown {
  label: string;
  amount: number;
  annualAmount: number;
}

export interface CalculatorResult {
  country: CountryCode;
  currency: string;
  currencySymbol: string;
  grossPay: number;
  grossAnnual: number;
  federalTax: number;
  stateTax: number;
  localTax: number;
  socialSecurity: number;
  medicare: number;
  /** CA SDI / similar state disability payroll tax (per period) */
  stateDisability: number;
  preTaxDeductions: number;
  postTaxDeductions: number;
  totalTaxes: number;
  netPay: number;
  netAnnual: number;
  effectiveTaxRate: number;
  breakdown: TaxBreakdown[];
  accuracyNotes: string[];
}

export const PAY_PERIODS: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  annual: 1,
};

export const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  semimonthly: "Semi-monthly",
  monthly: "Monthly",
  annual: "Annual",
};

export const STATE_NAMES: Record<StateCode, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming",
};

export const ALL_STATES = Object.keys(STATE_NAMES) as StateCode[];

export const PROVINCE_NAMES: Record<ProvinceCode, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

export const ALL_PROVINCES = Object.keys(PROVINCE_NAMES) as ProvinceCode[];

export interface CountryMeta {
  code: CountryCode;
  name: string;
  currency: string;
  currencySymbol: string;
  regionLabel?: string;
  defaultGross: number;
  slug: string;
}

export const COUNTRIES: Record<CountryCode, CountryMeta> = {
  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    currencySymbol: "$",
    regionLabel: "State",
    defaultGross: Math.round((60000 / 26) * 100) / 100,
    slug: "",
  },
  UK: {
    code: "UK",
    name: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    regionLabel: "Nation",
    defaultGross: Math.round((35000 / 12) * 100) / 100,
    slug: "uk-paycheck-calculator",
  },
  CA: {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    currencySymbol: "C$",
    regionLabel: "Province",
    defaultGross: Math.round((70000 / 26) * 100) / 100,
    slug: "canada-paycheck-calculator",
  },
  AU: {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    currencySymbol: "A$",
    defaultGross: Math.round((80000 / 12) * 100) / 100,
    slug: "australia-paycheck-calculator",
  },
  IE: {
    code: "IE",
    name: "Ireland",
    currency: "EUR",
    currencySymbol: "€",
    defaultGross: Math.round((45000 / 12) * 100) / 100,
    slug: "ireland-paycheck-calculator",
  },
  DE: {
    code: "DE",
    name: "Germany",
    currency: "EUR",
    currencySymbol: "€",
    defaultGross: Math.round((50000 / 12) * 100) / 100,
    slug: "germany-paycheck-calculator",
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    currency: "EUR",
    currencySymbol: "€",
    defaultGross: Math.round((45000 / 12) * 100) / 100,
    slug: "netherlands-paycheck-calculator",
  },
  FR: {
    code: "FR",
    name: "France",
    currency: "EUR",
    currencySymbol: "€",
    defaultGross: Math.round((40000 / 12) * 100) / 100,
    slug: "france-paycheck-calculator",
  },
  ES: {
    code: "ES",
    name: "Spain",
    currency: "EUR",
    currencySymbol: "€",
    defaultGross: Math.round((32000 / 12) * 100) / 100,
    slug: "spain-paycheck-calculator",
  },
  IT: {
    code: "IT",
    name: "Italy",
    currency: "EUR",
    currencySymbol: "€",
    defaultGross: Math.round((35000 / 12) * 100) / 100,
    slug: "italy-paycheck-calculator",
  },
  SE: {
    code: "SE",
    name: "Sweden",
    currency: "SEK",
    currencySymbol: "kr",
    defaultGross: Math.round((420000 / 12) * 100) / 100,
    slug: "sweden-paycheck-calculator",
  },
  CH: {
    code: "CH",
    name: "Switzerland",
    currency: "CHF",
    currencySymbol: "CHF ",
    defaultGross: Math.round((90000 / 12) * 100) / 100,
    slug: "switzerland-paycheck-calculator",
  },
};

export const ALL_COUNTRIES = Object.keys(COUNTRIES) as CountryCode[];

export const EUROPE_COUNTRIES: CountryCode[] = [
  "IE",
  "DE",
  "NL",
  "FR",
  "ES",
  "IT",
  "SE",
  "CH",
];
