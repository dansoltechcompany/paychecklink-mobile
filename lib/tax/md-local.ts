/**
 * Maryland county / Baltimore City local income tax (mandatory piggyback).
 * Source: Comptroller of Maryland, Withholding Tax Facts Jan–Dec 2026.
 * https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/legal-publications/facts/withholding-tax-facts-2026.pdf
 *
 * Local tax is a % of Maryland taxable income. Anne Arundel and Frederick use
 * income tiers; we approximate those counties at their mid/top flat rates for
 * typical paycheck wages (documented in methodology).
 */

export interface MdLocalInfo {
  county: string;
  /** Flat local rate applied to MD taxable wages (approximate for tiered counties) */
  rate: number;
  note?: string;
}

/** Flat 2026 local rates (Comptroller). Tiered counties use a representative rate. */
export const MD_COUNTY_RATES_2026: Record<string, MdLocalInfo> = {
  allegany: { county: "Allegany County", rate: 0.032 },
  anne_arundel: {
    county: "Anne Arundel County",
    rate: 0.0294,
    note: "Tiered 2.70%–3.20%; mid bracket used for typical wages",
  },
  baltimore_county: { county: "Baltimore County", rate: 0.032 },
  baltimore_city: { county: "Baltimore City", rate: 0.032 },
  calvert: { county: "Calvert County", rate: 0.032 },
  caroline: { county: "Caroline County", rate: 0.032 },
  carroll: { county: "Carroll County", rate: 0.0303 },
  cecil: { county: "Cecil County", rate: 0.0274 },
  charles: { county: "Charles County", rate: 0.0303 },
  dorchester: { county: "Dorchester County", rate: 0.033 },
  frederick: {
    county: "Frederick County",
    rate: 0.0296,
    note: "Tiered 2.25%–3.20%; mid/upper bracket used for typical wages",
  },
  garrett: { county: "Garrett County", rate: 0.0265 },
  harford: { county: "Harford County", rate: 0.0306 },
  howard: { county: "Howard County", rate: 0.032 },
  kent: { county: "Kent County", rate: 0.033 },
  montgomery: { county: "Montgomery County", rate: 0.032 },
  prince_georges: { county: "Prince George's County", rate: 0.032 },
  queen_annes: { county: "Queen Anne's County", rate: 0.032 },
  st_marys: { county: "St. Mary's County", rate: 0.032 },
  somerset: { county: "Somerset County", rate: 0.032 },
  talbot: { county: "Talbot County", rate: 0.024 },
  washington: { county: "Washington County", rate: 0.0295 },
  wicomico: { county: "Wicomico County", rate: 0.032 },
  worcester: { county: "Worcester County", rate: 0.0225 },
};

/**
 * ZIP → county key for common Maryland prefixes / cities.
 * Not exhaustive — unknown MD ZIPs fall back to defaultMdLocalRate().
 */
const MD_ZIP_TO_COUNTY: Record<string, keyof typeof MD_COUNTY_RATES_2026> = {
  // Baltimore City
  "21201": "baltimore_city",
  "21202": "baltimore_city",
  "21205": "baltimore_city",
  "21211": "baltimore_city",
  "21218": "baltimore_city",
  "21224": "baltimore_city",
  "21230": "baltimore_city",
  "21231": "baltimore_city",
  // Baltimore County
  "21204": "baltimore_county",
  "21208": "baltimore_county",
  "21212": "baltimore_county",
  "21234": "baltimore_county",
  "21286": "baltimore_county",
  // Montgomery
  "20814": "montgomery",
  "20815": "montgomery",
  "20850": "montgomery",
  "20852": "montgomery",
  "20854": "montgomery",
  "20874": "montgomery",
  "20901": "montgomery",
  "20902": "montgomery",
  "20906": "montgomery",
  "20910": "montgomery",
  // Prince George's
  "20705": "prince_georges",
  "20706": "prince_georges",
  "20707": "prince_georges",
  "20715": "prince_georges",
  "20716": "prince_georges",
  "20720": "prince_georges",
  "20721": "prince_georges",
  "20737": "prince_georges",
  "20740": "prince_georges",
  "20743": "prince_georges",
  "20746": "prince_georges",
  "20747": "prince_georges",
  "20770": "prince_georges",
  "20772": "prince_georges",
  "20774": "prince_georges",
  "20782": "prince_georges",
  "20783": "prince_georges",
  "20784": "prince_georges",
  "20785": "prince_georges",
  // Anne Arundel
  "21012": "anne_arundel",
  "21032": "anne_arundel",
  "21035": "anne_arundel",
  "21037": "anne_arundel",
  "21054": "anne_arundel",
  "21060": "anne_arundel",
  "21061": "anne_arundel",
  "21108": "anne_arundel",
  "21114": "anne_arundel",
  "21122": "anne_arundel",
  "21140": "anne_arundel",
  "21146": "anne_arundel",
  "21401": "anne_arundel",
  "21403": "anne_arundel",
  // Howard
  "21042": "howard",
  "21043": "howard",
  "21044": "howard",
  "21045": "howard",
  "21046": "howard",
  "20723": "howard",
  "20759": "howard",
  // Frederick
  "21701": "frederick",
  "21702": "frederick",
  "21703": "frederick",
  "21704": "frederick",
  // Harford
  "21001": "harford",
  "21009": "harford",
  "21014": "harford",
  "21015": "harford",
  "21017": "harford",
  "21040": "harford",
  "21078": "harford",
  "21085": "harford",
  // Carroll
  "21102": "carroll",
  "21104": "carroll",
  "21157": "carroll",
  "21158": "carroll",
  "21784": "carroll",
  // Charles
  "20601": "charles",
  "20602": "charles",
  "20603": "charles",
  "20613": "charles",
  "20616": "charles",
  "20640": "charles",
  "20646": "charles",
  // Calvert
  "20639": "calvert",
  "20657": "calvert",
  "20678": "calvert",
  "20685": "calvert",
  "20688": "calvert",
  "20689": "calvert",
  // St. Mary's
  "20619": "st_marys",
  "20620": "st_marys",
  "20628": "st_marys",
  "20634": "st_marys",
  "20636": "st_marys",
  "20650": "st_marys",
  "20653": "st_marys",
  "20659": "st_marys",
  "20670": "st_marys",
  "20674": "st_marys",
  "20680": "st_marys",
  "20686": "st_marys",
  "20690": "st_marys",
  "20692": "st_marys",
  // Cecil
  "21901": "cecil",
  "21903": "cecil",
  "21904": "cecil",
  "21911": "cecil",
  "21921": "cecil",
  // Washington
  "21740": "washington",
  "21742": "washington",
  "21746": "washington",
  "21767": "washington",
  "21783": "washington",
  // Wicomico / Worcester / Somerset / Dorchester / Talbot / Caroline / Kent / Queen Anne's / Garrett / Allegany
  "21801": "wicomico",
  "21804": "wicomico",
  "21811": "worcester",
  "21813": "worcester",
  "21817": "somerset",
  "21821": "somerset",
  "21613": "dorchester",
  "21601": "talbot",
  "21617": "queen_annes",
  "21620": "kent",
  "21629": "caroline",
  "21502": "allegany",
  "21520": "garrett",
  "21536": "garrett",
};

/** Most common MD local rate when ZIP is unknown (Comptroller median cluster). */
export const MD_DEFAULT_LOCAL_RATE = 0.032;

export function lookupMdLocalByZip(zip: string): MdLocalInfo | null {
  const normalized = zip.trim().slice(0, 5);
  if (!/^\d{5}$/.test(normalized)) return null;
  const key = MD_ZIP_TO_COUNTY[normalized];
  if (!key) return null;
  return MD_COUNTY_RATES_2026[key];
}

export function defaultMdLocal(): MdLocalInfo {
  return {
    county: "Maryland (county unknown)",
    rate: MD_DEFAULT_LOCAL_RATE,
    note: "Default 3.20% local — enter a Maryland ZIP for your county rate (2.25%–3.30%)",
  };
}

export const MD_LOCAL_SOURCE =
  "Comptroller of Maryland, Withholding Tax Facts January–December 2026";
