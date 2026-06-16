// Analisi di diversificazione del portafoglio: aggrega le esposizioni per area
// geografica, settore e asset class (con look-through degli ETF), calcola indici
// di concentrazione (HHI, posizioni effettive) e un punteggio con giudizio.
import { classifyHolding, isReferenced, type Weights } from "@/lib/classify";
import { enrichIsins } from "@/lib/openfigi";

export interface PositionInput {
  isin: string;
  nome: string;
  sezione?: string;
  controvalore: number | null;
}

export interface Slice {
  name: string;
  value: number;
  pct: number;
}

export interface DivResult {
  totalInvested: number;
  totalPortfolio: number;
  byAssetClass: Slice[];
  byRegion: Slice[];
  bySector: Slice[];
  positions: { nome: string; isin: string; value: number; weight: number }[];
  metrics: {
    nPos: number;
    effectiveHoldings: number;
    topWeight: number;
    top3Weight: number;
    effRegions: number;
    effSectors: number;
    topRegion: Slice | null;
    topSector: Slice | null;
  };
  score: number;
  band: string;
  tone: "neg" | "warn" | "ok" | "great";
  insights: { kind: "pos" | "warn" | "info"; text: string }[];
  enrichedExternally: boolean;
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function normalize(w: Weights): Weights {
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (sum <= 0) return w;
  const out: Weights = {};
  for (const [k, v] of Object.entries(w)) out[k] = v / sum;
  return out;
}

function toSlices(acc: Map<string, number>, base: number): Slice[] {
  return Array.from(acc.entries())
    .map(([name, value]) => ({ name, value: r2(value), pct: base ? r2((value / base) * 100) : 0 }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

function hhi(weights: number[]): number {
  return weights.reduce((a, w) => a + w * w, 0);
}

export async function buildDiversification(
  rawPositions: PositionInput[],
  liquidity: number
): Promise<DivResult> {
  const positions = rawPositions.filter((p) => (p.controvalore ?? 0) > 0);
  const totalInvested = positions.reduce((a, p) => a + (p.controvalore ?? 0), 0);

  // arricchimento esterno (OpenFIGI) solo per ISIN non noti
  const unknown = positions.filter((p) => p.isin && !isReferenced(p.isin)).map((p) => p.isin);
  let hints = new Map<string, { assetClass?: any }>();
  let enrichedExternally = false;
  if (unknown.length) {
    const ext = await enrichIsins(unknown);
    if (ext.size) enrichedExternally = true;
    hints = ext;
  }

  const regionAcc = new Map<string, number>();
  const sectorAcc = new Map<string, number>();
  const assetAcc = new Map<string, number>();
  const add = (acc: Map<string, number>, k: string, v: number) => acc.set(k, (acc.get(k) ?? 0) + v);

  for (const p of positions) {
    const value = p.controvalore ?? 0;
    const hint = hints.get(p.isin);
    const desc = classifyHolding(p.isin, p.nome, p.sezione, hint ? { assetClass: hint.assetClass } : undefined);
    const regions = normalize(desc.regions);
    const sectors = normalize(desc.sectors);
    for (const [reg, f] of Object.entries(regions)) add(regionAcc, reg, value * f);
    for (const [sec, f] of Object.entries(sectors)) add(sectorAcc, sec, value * f);
    add(assetAcc, desc.assetClass, value);
  }
  if (liquidity > 0) add(assetAcc, "Liquidità", liquidity);

  const totalPortfolio = totalInvested + Math.max(liquidity, 0);

  const byRegion = toSlices(regionAcc, totalInvested);
  const bySector = toSlices(sectorAcc, totalInvested);
  const byAssetClass = toSlices(assetAcc, totalPortfolio);

  // metriche di concentrazione
  const posWeights = positions.map((p) => (p.controvalore ?? 0) / totalInvested).sort((a, b) => b - a);
  const hhiPos = hhi(posWeights);
  const effectiveHoldings = hhiPos ? 1 / hhiPos : 0;
  const topWeight = posWeights.length ? posWeights[0] * 100 : 0;
  const top3Weight = posWeights.slice(0, 3).reduce((a, w) => a + w, 0) * 100;

  const effRegions = 1 / (hhi(byRegion.map((s) => s.value / totalInvested)) || 1);
  const effSectors = 1 / (hhi(bySector.map((s) => s.value / totalInvested)) || 1);
  const effAsset = 1 / (hhi(byAssetClass.map((s) => s.value / totalPortfolio)) || 1);

  // punteggio 0-100 (sotto-punteggi normalizzati su target ragionevoli)
  const posScore = clamp01((effectiveHoldings - 1) / (10 - 1));
  const regionScore = clamp01((effRegions - 1) / (5 - 1));
  const sectorScore = clamp01((effSectors - 1) / (8 - 1));
  const assetScore = clamp01((effAsset - 1) / (3 - 1));
  const score = Math.round(
    100 * (0.3 * posScore + 0.25 * regionScore + 0.25 * sectorScore + 0.2 * assetScore)
  );

  let band = "Bassa", tone: DivResult["tone"] = "neg";
  if (score >= 80) { band = "Ottima"; tone = "great"; }
  else if (score >= 60) { band = "Buona"; tone = "ok"; }
  else if (score >= 40) { band = "Media"; tone = "warn"; }

  // insight
  const topRegion = byRegion[0] ?? null;
  const topSector = bySector[0] ?? null;
  const azionario = byAssetClass.find((s) => s.name === "Azionario");
  const obblig = byAssetClass.find((s) => s.name === "Obbligazionario");
  const insights: DivResult["insights"] = [];
  const topPos = [...positions].sort((a, b) => (b.controvalore ?? 0) - (a.controvalore ?? 0))[0];

  if (topWeight > 20 && topPos) {
    insights.push({ kind: "warn", text: `La posizione più grande (${topPos.nome}) pesa il ${r2(topWeight)}% del portafoglio investito: concentrazione su singolo strumento.` });
  }
  if (topRegion && topRegion.pct > 60) {
    insights.push({ kind: "warn", text: `Forte concentrazione geografica su ${topRegion.name} (${topRegion.pct}%). Valuta esposizione ad altre aree.` });
  } else if (topRegion) {
    insights.push({ kind: "pos", text: `Buona ripartizione geografica: area principale ${topRegion.name} al ${topRegion.pct}%.` });
  }
  if (topSector && topSector.pct > 32) {
    insights.push({ kind: "warn", text: `Esposizione settoriale elevata su ${topSector.name} (${topSector.pct}%).` });
  }
  if (azionario && azionario.pct > 85) {
    insights.push({ kind: "warn", text: `Portafoglio quasi interamente azionario (${azionario.pct}%): più obbligazioni ridurrebbero la volatilità.` });
  } else if (obblig && obblig.pct >= 10) {
    insights.push({ kind: "pos", text: `Presenza obbligazionaria del ${obblig.pct}%: contribuisce a stabilizzare il portafoglio.` });
  }
  if (effectiveHoldings >= 8) {
    insights.push({ kind: "pos", text: `Numero di posizioni effettive elevato (${r2(effectiveHoldings)}): rischio singolo titolo contenuto.` });
  } else if (effectiveHoldings < 5) {
    insights.push({ kind: "warn", text: `Poche posizioni effettive (${r2(effectiveHoldings)}): il portafoglio dipende da pochi titoli.` });
  }
  const em = byRegion.find((s) => s.name === "Mercati Emergenti");
  if (em && em.pct >= 8) {
    insights.push({ kind: "info", text: `Esposizione ai mercati emergenti del ${em.pct}%: maggiore potenziale ma più volatilità.` });
  }

  return {
    totalInvested: r2(totalInvested),
    totalPortfolio: r2(totalPortfolio),
    byAssetClass,
    byRegion,
    bySector,
    positions: positions
      .map((p) => ({ nome: p.nome, isin: p.isin, value: r2(p.controvalore ?? 0), weight: r2(((p.controvalore ?? 0) / totalInvested) * 100) }))
      .sort((a, b) => b.value - a.value),
    metrics: {
      nPos: positions.length,
      effectiveHoldings: r2(effectiveHoldings),
      topWeight: r2(topWeight),
      top3Weight: r2(top3Weight),
      effRegions: r2(effRegions),
      effSectors: r2(effSectors),
      topRegion,
      topSector,
    },
    score,
    band,
    tone,
    insights,
    enrichedExternally,
  };
}
