// Classificazione degli strumenti con "look-through": ogni ETF ampio viene
// scomposto nelle sue aree geografiche e settori (composizioni indicative degli
// indici noti), così l'aggregato del portafoglio è realistico.
// Fallback: parole chiave nel nome → prefisso ISIN → hint esterni (OpenFIGI).

export type Weights = Record<string, number>;

export interface Descriptor {
  assetClass: AssetClass;
  regions: Weights; // somma ≈ 1 (per la parte non liquidità)
  sectors: Weights; // somma ≈ 1
}

export type AssetClass = "Azionario" | "Obbligazionario" | "Alternativi" | "Liquidità";

export interface ClassifyHint {
  assetClass?: AssetClass; // es. da OpenFIGI (securityType)
}

// --- etichette aree ---
const R = {
  US: "Stati Uniti",
  EU: "Europa",
  JP: "Giappone",
  PAC: "Pacifico",
  EM: "Mercati Emergenti",
  OTH: "Altri / Globale",
} as const;

// --- look-through aree geografiche (frazioni indicative) ---
const MSCI_WORLD_R: Weights = { [R.US]: 0.71, [R.EU]: 0.15, [R.JP]: 0.06, [R.PAC]: 0.03, [R.OTH]: 0.05 };
const FTSE_AW_R: Weights = { [R.US]: 0.6, [R.EU]: 0.14, [R.JP]: 0.06, [R.PAC]: 0.03, [R.EM]: 0.11, [R.OTH]: 0.06 };
const US_R: Weights = { [R.US]: 1 };
const EU_R: Weights = { [R.EU]: 1 };
const EM_R: Weights = { [R.EM]: 1 };
const GLOBAL_R: Weights = { [R.OTH]: 1 };

// --- look-through settori (frazioni indicative GICS) ---
const BROAD: Weights = {
  Tecnologia: 0.24, Finanza: 0.15, Salute: 0.12, "Beni voluttuari": 0.1, Industria: 0.1,
  Comunicazioni: 0.08, "Beni di prima necessità": 0.06, Energia: 0.045, Materiali: 0.04,
  Utilities: 0.03, Immobiliare: 0.025,
};
const US_SEC: Weights = {
  Tecnologia: 0.3, Finanza: 0.13, Salute: 0.12, "Beni voluttuari": 0.11, Comunicazioni: 0.09,
  Industria: 0.08, "Beni di prima necessità": 0.06, Energia: 0.04, Utilities: 0.025,
  Materiali: 0.022, Immobiliare: 0.021,
};
const EU_SEC: Weights = {
  Finanza: 0.18, Industria: 0.17, Salute: 0.15, "Beni di prima necessità": 0.12,
  "Beni voluttuari": 0.1, Tecnologia: 0.08, Materiali: 0.07, Energia: 0.05,
  Comunicazioni: 0.05, Utilities: 0.03,
};
const EM_SEC: Weights = {
  Tecnologia: 0.22, Finanza: 0.22, "Beni voluttuari": 0.13, Comunicazioni: 0.1, Materiali: 0.08,
  Industria: 0.07, "Beni di prima necessità": 0.06, Energia: 0.06, Salute: 0.04, Utilities: 0.02,
};
const TECH: Weights = { Tecnologia: 1 };
const BOND_SEC: Weights = { Obbligazionario: 1 };
const PRIV_SEC: Weights = { "Private Markets": 1 };

// --- mappa di riferimento per ISIN (titoli noti del portafoglio) ---
const REFERENCE: Record<string, Descriptor> = {
  IE00B3WJKG14: { assetClass: "Azionario", regions: US_R, sectors: TECH }, // S&P500 Info Tech
  IE00B4L5Y983: { assetClass: "Azionario", regions: MSCI_WORLD_R, sectors: BROAD }, // MSCI World
  IE00BKM4GZ66: { assetClass: "Azionario", regions: EM_R, sectors: EM_SEC }, // MSCI EM IMI
  IE00B5BMR087: { assetClass: "Azionario", regions: US_R, sectors: US_SEC }, // Core S&P500
  LU0908500753: { assetClass: "Azionario", regions: EU_R, sectors: EU_SEC }, // Stoxx Europe 600
  IE00BK5BQT80: { assetClass: "Azionario", regions: FTSE_AW_R, sectors: BROAD }, // FTSE All-World
  IE000YU9K6K2: { assetClass: "Azionario", regions: { [R.US]: 0.7, [R.EU]: 0.2, [R.OTH]: 0.1 }, sectors: { Tecnologia: 0.6, Industria: 0.4 } }, // Space Innovators
  US70450Y1038: { assetClass: "Azionario", regions: US_R, sectors: { Finanza: 1 } }, // PayPal
  US0846707026: { assetClass: "Azionario", regions: US_R, sectors: { Finanza: 1 } }, // Berkshire
  CA5394811015: { assetClass: "Azionario", regions: { [R.OTH]: 1 }, sectors: { "Beni di prima necessità": 1 } }, // Loblaw
  IE00BDB6Q211: { assetClass: "Azionario", regions: { [R.US]: 0.6, [R.EU]: 0.4 }, sectors: { Finanza: 1 } }, // Willis Towers Watson
  LU3170240538: { assetClass: "Alternativi", regions: GLOBAL_R, sectors: PRIV_SEC }, // Private Equity
  // Obbligazioni
  IT0005534141: { assetClass: "Obbligazionario", regions: EU_R, sectors: BOND_SEC }, // BTP
  IT0005534281: { assetClass: "Obbligazionario", regions: EU_R, sectors: BOND_SEC },
  IT0005024234: { assetClass: "Obbligazionario", regions: EU_R, sectors: BOND_SEC }, // BTP 14-30
  XS3021378388: { assetClass: "Obbligazionario", regions: EU_R, sectors: BOND_SEC }, // Romania
  XS0213101073: { assetClass: "Obbligazionario", regions: EM_R, sectors: BOND_SEC }, // Pemex
  XS2433361719: { assetClass: "Obbligazionario", regions: EU_R, sectors: BOND_SEC }, // Wizz Air
  IE0007UPSEA3: { assetClass: "Obbligazionario", regions: US_R, sectors: BOND_SEC }, // iBonds USD corp
  US91282CMS79: { assetClass: "Obbligazionario", regions: US_R, sectors: BOND_SEC }, // US Treasury
};

const PREFIX_REGION: Record<string, string> = {
  US: R.US, CA: R.OTH, IT: R.EU, FR: R.EU, DE: R.EU, ES: R.EU, NL: R.EU, GB: R.EU,
  CH: R.EU, IE: R.EU, LU: R.EU, JP: R.JP, CN: R.EM, HK: R.EM, BR: R.EM, IN: R.EM,
};

function assetFromSezione(sezione?: string): AssetClass {
  const s = (sezione ?? "").toLowerCase();
  if (s.includes("reddito")) return "Obbligazionario";
  if (s.includes("private")) return "Alternativi";
  return "Azionario";
}

function regionsFromName(name: string): Weights | null {
  const n = name.toLowerCase();
  if (n.includes("msci world") || n.includes("core msci world")) return MSCI_WORLD_R;
  if (n.includes("all-world") || n.includes("all world")) return FTSE_AW_R;
  if (n.includes("emerging") || n.includes("msci em") || n.includes(" em ")) return EM_R;
  if (n.includes("s&p 500") || n.includes("s&p500") || n.includes("information tech")) return US_R;
  if (n.includes("europe") || n.includes("stoxx") || n.includes("euro ")) return EU_R;
  if (n.includes("treasury") || n.includes("us ")) return US_R;
  return null;
}
function sectorsFromName(name: string, asset: AssetClass): Weights {
  const n = name.toLowerCase();
  if (asset === "Obbligazionario") return BOND_SEC;
  if (asset === "Alternativi") return PRIV_SEC;
  if (n.includes("information tech") || n.includes("technology")) return TECH;
  if (n.includes("emerging") || n.includes("msci em")) return EM_SEC;
  if (n.includes("europe") || n.includes("stoxx")) return EU_SEC;
  if (n.includes("s&p 500") || n.includes("s&p500")) return US_SEC;
  return BROAD;
}

/** Classifica un titolo con look-through. */
export function classifyHolding(
  isin: string,
  nome: string,
  sezione?: string,
  hint?: ClassifyHint
): Descriptor {
  if (isin && REFERENCE[isin]) return REFERENCE[isin];

  const assetClass = hint?.assetClass ?? assetFromSezione(sezione);
  const regions =
    regionsFromName(nome) ??
    (isin ? { [PREFIX_REGION[isin.slice(0, 2)] ?? R.OTH]: 1 } : { [R.OTH]: 1 });
  const sectors = sectorsFromName(nome, assetClass);
  return { assetClass, regions, sectors };
}

export const REGION_LABELS = R;

/** True se l'ISIN è nella mappa di riferimento (classificazione certa). */
export function isReferenced(isin: string): boolean {
  return !!isin && !!REFERENCE[isin];
}
