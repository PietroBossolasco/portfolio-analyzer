// Valutazione complessiva del portafoglio ("health check") con logica da
// esperto di finanza personale: punteggi su più dimensioni e consigli pratici.
// NB: euristiche educative, non consulenza finanziaria personalizzata.
import type { Statistiche } from "@/lib/analytics";
import type { DivResult } from "@/lib/diversification";

export interface Tip {
  priority: "alta" | "media" | "info";
  text: string;
}
export interface HealthDimension {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number;
  status: "good" | "warn" | "bad";
  summary: string;
  tips: Tip[];
}
export interface HealthAction {
  priority: "alta" | "media";
  area: string;
  text: string;
}
export interface HealthResult {
  overall: number;
  band: string;
  tone: "neg" | "warn" | "ok" | "great";
  headline: string;
  dimensions: HealthDimension[];
  actions: HealthAction[];
  estimatedTer: number;
  passiveYieldPct: number;
  annualReturnPct: number | null;
}

export interface HealthInput {
  stats: Statistiche;
  div: DivResult;
  positions: { isin: string; nome: string; sezione?: string; controvalore: number | null }[];
  targetProfile: string;
  behavior: {
    monthsTotal: number;
    monthsWithContrib: number;
    tradesPerYear: number;
    realizedLossCount: number;
    yearsActive: number;
  };
}

type Mix = Record<string, number>;
const PROFILES: Record<string, Mix> = {
  Prudente: { Azionario: 30, Obbligazionario: 55, Alternativi: 5, Liquidità: 10 },
  Bilanciato: { Azionario: 55, Obbligazionario: 30, Alternativi: 10, Liquidità: 5 },
  Dinamico: { Azionario: 75, Obbligazionario: 15, Alternativi: 7, Liquidità: 3 },
};

// TER (costo annuo) indicativo per gli strumenti noti; 0 per titoli singoli/obbligazioni dirette.
const TER_MAP: Record<string, number> = {
  IE00B3WJKG14: 0.15, IE00B4L5Y983: 0.2, IE00BKM4GZ66: 0.18, IE00B5BMR087: 0.07,
  LU0908500753: 0.07, IE00BK5BQT80: 0.22, IE000YU9K6K2: 0.55, IE0007UPSEA3: 0.12,
  LU3170240538: 1.8,
};

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const r1 = (x: number) => Math.round(x * 10) / 10;
/** Interpolazione lineare con clamp tra (x0,y0) e (x1,y1). */
function lin(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x <= Math.min(x0, x1)) return x0 < x1 ? y0 : y1;
  if (x >= Math.max(x0, x1)) return x0 < x1 ? y1 : y0;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}
function statusOf(score: number): "good" | "warn" | "bad" {
  return score >= 70 ? "good" : score >= 50 ? "warn" : "bad";
}

function estimateTer(positions: HealthInput["positions"]): number {
  let val = 0, cost = 0;
  for (const p of positions) {
    const v = p.controvalore ?? 0;
    if (v <= 0) continue;
    let ter = TER_MAP[p.isin];
    if (ter == null) {
      const sez = (p.sezione ?? "").toLowerCase();
      if (sez.includes("private")) ter = 1.8;
      else if (sez.includes("reddito")) ter = p.isin.startsWith("IE") ? 0.12 : 0; // ETF obbl. vs bond diretto
      else ter = /msci|s&p|stoxx|ftse|ucits|etf|core /i.test(p.nome) ? 0.2 : 0; // ETF vs azione
    }
    val += v;
    cost += v * ter;
  }
  return val ? cost / val : 0;
}

export function computeHealthCheck(input: HealthInput): HealthResult {
  const { stats, div, positions, targetProfile, behavior } = input;
  const dims: HealthDimension[] = [];

  const assetPct: Record<string, number> = {};
  for (const s of div.byAssetClass) assetPct[s.name] = s.pct;
  const cashPct = assetPct["Liquidità"] ?? 0;
  const equityPct = assetPct["Azionario"] ?? 0;
  const bondPct = assetPct["Obbligazionario"] ?? 0;

  const estimatedTer = estimateTer(positions);
  const years = Math.max(behavior.yearsActive, 0.5);
  const annualIncome = (stats.dividendi + stats.interessi) / years;
  const passiveYieldPct = stats.patrimonio ? (annualIncome / stats.patrimonio) * 100 : 0;
  const annualReturnPct =
    stats.rendimentoPct != null && behavior.yearsActive >= 0.5
      ? (Math.pow(1 + stats.rendimentoPct / 100, 1 / behavior.yearsActive) - 1) * 100
      : stats.rendimentoPct;

  // 1) DIVERSIFICAZIONE
  {
    const tips: Tip[] = [];
    if (div.metrics.topRegion && div.metrics.topRegion.pct > 55)
      tips.push({ priority: "media", text: `Esposizione geografica concentrata su ${div.metrics.topRegion.name} (${div.metrics.topRegion.pct}%): un ETF globale può ribilanciare le aree.` });
    if (div.metrics.topSector && div.metrics.topSector.pct > 30)
      tips.push({ priority: "media", text: `Settore ${div.metrics.topSector.name} sopra il 30%: attenzione ai temi/settori troppo pesanti.` });
    if (div.metrics.effectiveHoldings < 6)
      tips.push({ priority: "media", text: `Poche posizioni effettive (${div.metrics.effectiveHoldings}): aumentare gli strumenti riduce il rischio specifico.` });
    if (!tips.length) tips.push({ priority: "info", text: "Buona ampiezza di diversificazione: mantienila nel tempo." });
    dims.push({
      key: "div", label: "Diversificazione", weight: 0.2, score: div.score, status: statusOf(div.score),
      summary: `Diversificazione ${div.band.toLowerCase()} (${div.score}/100), ${div.metrics.effectiveHoldings} posizioni effettive.`,
      tips,
    });
  }

  // 2) ALLOCAZIONE vs PROFILO TARGET
  {
    const target = PROFILES[targetProfile] ?? PROFILES.Bilanciato;
    const drift = (["Azionario", "Obbligazionario", "Alternativi", "Liquidità"] as const)
      .reduce((a, c) => a + Math.abs((assetPct[c] ?? 0) - (target[c] ?? 0)), 0) / 2;
    const score = clamp(100 - drift * 2.6);
    const tips: Tip[] = [];
    for (const c of ["Azionario", "Obbligazionario", "Alternativi", "Liquidità"] as const) {
      const d = (assetPct[c] ?? 0) - (target[c] ?? 0);
      if (d >= 8) tips.push({ priority: "media", text: `${c} sopra il target di ${r1(d)} punti: valuta di alleggerire verso le altre classi.` });
      else if (d <= -8) tips.push({ priority: "media", text: `${c} sotto il target di ${r1(-d)} punti: valuta di rafforzarlo.` });
    }
    if (!tips.length) tips.push({ priority: "info", text: `Allocazione coerente col profilo "${targetProfile}".` });
    dims.push({
      key: "alloc", label: "Allocazione & rischio", weight: 0.18, score, status: statusOf(score),
      summary: `Azionario ${r1(equityPct)}% · Obbligazionario ${r1(bondPct)}% · scostamento dal profilo "${targetProfile}" ${r1(drift)} pt.`,
      tips,
    });
  }

  // 3) COSTI
  {
    const score = clamp(lin(estimatedTer, 0.15, 1.0, 95, 30));
    const tips: Tip[] = [];
    if (estimatedTer > 0.35) tips.push({ priority: "alta", text: `Costo corrente stimato ${r1(estimatedTer)}%/anno: privilegia ETF a basso costo (TER < 0,20%). Su orizzonti lunghi i costi erodono molto i rendimenti.` });
    const pe = positions.find((p) => (p.sezione ?? "").toLowerCase().includes("private"));
    if (pe) tips.push({ priority: "media", text: "I prodotti Private Markets hanno costi elevati e bassa liquidità: mantienili una quota contenuta del portafoglio." });
    if ((stats.nBuy + stats.nSell) / years > 30) tips.push({ priority: "media", text: "Molte operazioni all'anno: le commissioni fisse pesano sui piccoli importi. Accorpa gli acquisti." });
    if (!tips.length) tips.push({ priority: "info", text: `Costo corrente contenuto (${r1(estimatedTer)}%/anno): ottimo per il lungo periodo.` });
    dims.push({
      key: "cost", label: "Costi", weight: 0.15, score, status: statusOf(score),
      summary: `TER medio stimato ${r1(estimatedTer)}%/anno; commissioni pagate ${stats.commissioni.toFixed(0)} €.`,
      tips,
    });
  }

  // 4) CONCENTRAZIONE
  {
    const tw = div.metrics.topWeight;
    const score = clamp(lin(tw, 8, 30, 95, 30));
    const tips: Tip[] = [];
    if (tw > 15) tips.push({ priority: tw > 25 ? "alta" : "media", text: `La prima posizione pesa ${r1(tw)}%: come regola pratica, evita che un singolo strumento superi il 20-25%.` });
    if (div.metrics.top3Weight > 65) tips.push({ priority: "media", text: `Le prime 3 posizioni pesano ${r1(div.metrics.top3Weight)}%: distribuisci i nuovi versamenti sulle posizioni più leggere.` });
    if (!tips.length) tips.push({ priority: "info", text: "Nessuna posizione domina il portafoglio: buona ripartizione." });
    dims.push({
      key: "conc", label: "Concentrazione", weight: 0.12, score, status: statusOf(score),
      summary: `Prima posizione ${r1(tw)}% · prime 3 ${r1(div.metrics.top3Weight)}%.`,
      tips,
    });
  }

  // 5) LIQUIDITÀ
  {
    const score = cashPct <= 6 ? clamp(lin(cashPct, 0, 6, 85, 92)) : clamp(lin(cashPct, 6, 20, 92, 35));
    const tips: Tip[] = [];
    if (cashPct > 12) tips.push({ priority: "media", text: `Liquidità non investita al ${r1(cashPct)}%: con l'inflazione il contante perde potere d'acquisto. Investi gradualmente (PAC) l'eccedenza.` });
    tips.push({ priority: "info", text: "Tieni il fondo d'emergenza (3-6 mesi di spese) su un conto separato e sicuro, distinto dagli investimenti." });
    dims.push({
      key: "liq", label: "Liquidità", weight: 0.1, score, status: statusOf(score),
      summary: `${r1(cashPct)}% del patrimonio in liquidità.`,
      tips,
    });
  }

  // 6) PERFORMANCE
  {
    const ar = annualReturnPct ?? 0;
    const score = clamp(lin(ar, -5, 8, 35, 90));
    const tips: Tip[] = [];
    if (ar < 0) tips.push({ priority: "info", text: "Rendimento negativo finora: normale nel breve periodo. Evita di vendere in preda all'emotività e ragiona sull'orizzonte lungo." });
    tips.push({ priority: "info", text: "Non inseguire i rendimenti passati: mantieni la rotta, versa con regolarità e lascia lavorare l'interesse composto." });
    dims.push({
      key: "perf", label: "Performance", weight: 0.1, score, status: statusOf(score),
      summary: annualReturnPct != null
        ? `Rendimento annualizzato stimato ${r1(ar)}% · plus/minus latente ${(stats.plLatente ?? 0).toFixed(0)} €.`
        : "Storico troppo breve per annualizzare il rendimento.",
      tips,
    });
  }

  // 7) DISCIPLINA / COMPORTAMENTO
  {
    const reg = behavior.monthsTotal ? behavior.monthsWithContrib / behavior.monthsTotal : 0;
    const tradesYr = behavior.tradesPerYear;
    let score = 55 + reg * 45 - Math.max(0, tradesYr - 24) * 1.5 - behavior.realizedLossCount * 1.5;
    score = clamp(score);
    const tips: Tip[] = [];
    if (reg >= 0.5) tips.push({ priority: "info", text: `Versamenti regolari (${Math.round(reg * 100)}% dei mesi): il piano di accumulo (PAC) è l'abitudine più efficace per il lungo periodo.` });
    else tips.push({ priority: "media", text: "Versamenti irregolari: imposta un PAC automatico mensile per investire con metodo e mediare i prezzi." });
    if (tradesYr > 30) tips.push({ priority: "media", text: `Molte operazioni (${r1(tradesYr)}/anno): il \"fare troppo\" tende a ridurre i rendimenti. Meno movimenti, più costanza.` });
    dims.push({
      key: "disc", label: "Disciplina", weight: 0.1, score, status: statusOf(score),
      summary: `${behavior.monthsWithContrib}/${behavior.monthsTotal} mesi con versamenti · ${r1(tradesYr)} operazioni/anno.`,
      tips,
    });
  }

  // 8) REDDITO PASSIVO (informativo)
  {
    const score = clamp(lin(passiveYieldPct, 0, 4, 55, 92));
    const tips: Tip[] = [{
      priority: "info",
      text: "Molti ETF sono ad accumulazione: reinvestono i proventi automaticamente, perciò una cedola contabile bassa è normale ed è fiscalmente efficiente.",
    }];
    dims.push({
      key: "income", label: "Reddito passivo", weight: 0.05, score, status: statusOf(score),
      summary: `Rendita annua stimata ${r1(passiveYieldPct)}% (dividendi + cedole).`,
      tips,
    });
  }

  // PUNTEGGIO COMPLESSIVO (arrotonda i punteggi delle dimensioni)
  const overall = Math.round(dims.reduce((a, d) => a + d.score * d.weight, 0));
  dims.forEach((d) => (d.score = Math.round(d.score)));
  let band = "Critico", tone: HealthResult["tone"] = "neg";
  if (overall >= 85) { band = "Eccellente"; tone = "great"; }
  else if (overall >= 70) { band = "Solido"; tone = "ok"; }
  else if (overall >= 55) { band = "Discreto"; tone = "warn"; }
  else if (overall >= 40) { band = "Da migliorare"; tone = "warn"; }

  const headline =
    tone === "great" ? "Portafoglio costruito molto bene: poche rifiniture e mantieni la disciplina."
    : tone === "ok" ? "Buona base: alcuni accorgimenti possono renderlo più robusto."
    : tone === "warn" ? "Impianto discreto, ma ci sono aree concrete da migliorare."
    : "Diverse aree richiedono attenzione: parti dalle azioni prioritarie qui sotto.";

  // PIANO D'AZIONE: i consigli più rilevanti dalle dimensioni più deboli
  const actions: HealthAction[] = [];
  for (const d of [...dims].sort((a, b) => b.weight * (100 - b.score) - a.weight * (100 - a.score))) {
    for (const t of d.tips) {
      if (t.priority === "info") continue;
      actions.push({ priority: t.priority, area: d.label, text: t.text });
    }
  }
  actions.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "alta" ? -1 : 1));

  return {
    overall, band, tone, headline, dimensions: dims,
    actions: actions.slice(0, 6),
    estimatedTer: r1(estimatedTer), passiveYieldPct: r1(passiveYieldPct),
    annualReturnPct: annualReturnPct != null ? r1(annualReturnPct) : null,
  };
}
