// Calcoli finanziari derivati: prezzo di carico a costo medio ponderato,
// plus/minus realizzata, sintesi mensile, statistiche patrimoniali.
// Replica la logica dello script Python parse_portfolio.py.

export interface TxLike {
  id: string;
  datetime: Date;
  date: Date;
  tipo: string;
  tipoRaw: string;
  isin: string | null;
  nome: string | null;
  shares: number | null;
  price: number | null;
  amount: number | null;
  fee: number | null;
  tax: number | null;
}

export interface PositionLike {
  sezione: string;
  isin: string;
  nome: string;
  quantita: number | null;
  prezzoMercato: number | null;
  controvalore: number | null;
  peso: number | null;
}

export interface SnapshotLike {
  refDate: Date;
  totalValue: number | null;
  liquidity: number | null;
  allocConto: number | null;
  allocPrivate: number | null;
  allocReddito: number | null;
  positions: PositionLike[];
}

export interface CostBasis {
  avgCost: number | null;
  qty: number;
}

/** Costo medio ponderato per ISIN + plus/minus realizzata per ogni vendita. */
export function computeCostBasis(txs: TxLike[]): {
  basis: Map<string, CostBasis>;
  realizedByTx: Map<string, number>;
} {
  const hold = new Map<string, { qty: number; cost: number }>();
  const realizedByTx = new Map<string, number>();

  for (const t of txs) {
    const isin = t.isin?.trim();
    if (!isin || t.shares == null) continue;
    const shares = t.shares;
    const amount = t.amount;
    const fee = t.fee == null ? 0 : t.fee;
    const h = hold.get(isin) ?? { qty: 0, cost: 0 };
    hold.set(isin, h);

    if (t.tipoRaw === "MIGRATION") {
      if (shares > 0 && t.price != null) {
        h.qty += shares;
        h.cost += shares * t.price;
      } else if (shares < 0 && h.qty > 1e-9) {
        const avg = h.cost / h.qty;
        const q = Math.min(-shares, h.qty);
        h.cost -= avg * q;
        h.qty -= q;
      }
      continue;
    }

    if (t.tipoRaw === "BUY" && shares > 0) {
      let cost = amount != null ? Math.abs(amount) : shares * (t.price ?? 0);
      cost += Math.abs(fee);
      h.qty += shares;
      h.cost += cost;
    } else if (t.tipoRaw === "SELL" && shares < 0 && h.qty > 1e-9) {
      const avg = h.cost / h.qty;
      const q = Math.min(-shares, h.qty);
      const proceeds = amount != null ? Math.abs(amount) : 0;
      const pl = proceeds - avg * q - Math.abs(fee);
      realizedByTx.set(t.id, Math.round(pl * 100) / 100);
      h.cost -= avg * q;
      h.qty -= q;
    } else if (t.tipoRaw === "FINAL_MATURITY" && shares < 0 && h.qty > 1e-9) {
      // rimborso obbligazionario: rientro di capitale al costo (no plus/minus fittizia)
      const avg = h.cost / h.qty;
      const q = Math.min(-shares, h.qty);
      h.cost -= avg * q;
      h.qty -= q;
    }
  }

  const basis = new Map<string, CostBasis>();
  for (const [isin, h] of hold) {
    basis.set(isin, {
      avgCost: h.qty > 1e-9 ? Math.round((h.cost / h.qty) * 10000) / 10000 : null,
      qty: Math.round(h.qty * 1e6) / 1e6,
    });
  }
  return { basis, realizedByTx };
}

export interface EnrichedPosition extends PositionLike {
  prezzoCarico: number | null;
  valoreCarico: number | null;
  plusMinus: number | null;
  plusMinusPct: number | null;
}

export function enrichPositions(
  positions: PositionLike[],
  basis: Map<string, CostBasis>
): EnrichedPosition[] {
  return positions.map((p) => {
    const cb = basis.get(p.isin);
    const prezzoCarico = cb?.avgCost ?? null;
    const valoreCarico =
      prezzoCarico != null && p.quantita != null ? prezzoCarico * p.quantita : null;
    const plusMinus =
      valoreCarico != null && p.controvalore != null
        ? Math.round((p.controvalore - valoreCarico) * 100) / 100
        : null;
    const plusMinusPct =
      valoreCarico != null && valoreCarico !== 0 && p.controvalore != null
        ? Math.round((p.controvalore / valoreCarico - 1) * 10000) / 100
        : null;
    return { ...p, prezzoCarico, valoreCarico, plusMinus, plusMinusPct };
  });
}

const round2 = (x: number) => Math.round(x * 100) / 100;
function ym(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface MonthRow {
  periodo: string;
  totalValue: number | null;
  liquidityPdf: number | null;
  liquidityCalc: number | null;
  versamenti: number;
  commissioni: number;
  tasse: number;
  dividendi: number;
  interessi: number;
  versamentiCum: number;
  dividendiCum: number;
  interessiCum: number;
}

/** Sintesi mensile: aggregati CSV + snapshot PDF + saldo cassa calcolato. */
export function monthlySynthesis(txs: TxLike[], snapshots: SnapshotLike[]): MonthRow[] {
  const byMonth = new Map<
    string,
    { versamenti: number; commissioni: number; tasse: number; dividendi: number; interessi: number; flusso: number }
  >();
  for (const t of txs) {
    const k = ym(t.date);
    const m =
      byMonth.get(k) ??
      { versamenti: 0, commissioni: 0, tasse: 0, dividendi: 0, interessi: 0, flusso: 0 };
    const fee = t.fee ?? 0;
    const tax = t.tax ?? 0;
    const amt = t.amount ?? 0;
    m.commissioni += -fee;
    if (tax < 0) m.tasse += -tax;
    if (t.tipo === "Dividendo") m.dividendi += amt;
    if (t.tipo === "Interesse") m.interessi += amt;
    if (t.tipo === "Versamento") m.versamenti += amt;
    m.flusso += amt + fee + tax;
    byMonth.set(k, m);
  }

  const pdfByMonth = new Map<string, SnapshotLike>();
  for (const s of snapshots) pdfByMonth.set(ym(s.refDate), s);

  const months = Array.from(new Set([...byMonth.keys(), ...pdfByMonth.keys()])).sort();

  let cumFlusso = 0;
  let cumVers = 0;
  let cumDiv = 0;
  let cumInt = 0;
  const rows: MonthRow[] = [];
  for (const k of months) {
    const m = byMonth.get(k);
    const s = pdfByMonth.get(k);
    cumFlusso += m?.flusso ?? 0;
    cumVers += m?.versamenti ?? 0;
    cumDiv += m?.dividendi ?? 0;
    cumInt += m?.interessi ?? 0;
    rows.push({
      periodo: k,
      totalValue: s?.totalValue ?? null,
      liquidityPdf: s?.liquidity ?? null,
      liquidityCalc: round2(cumFlusso),
      versamenti: round2(m?.versamenti ?? 0),
      commissioni: round2(m?.commissioni ?? 0),
      tasse: round2(m?.tasse ?? 0),
      dividendi: round2(m?.dividendi ?? 0),
      interessi: round2(m?.interessi ?? 0),
      versamentiCum: round2(cumVers),
      dividendiCum: round2(cumDiv),
      interessiCum: round2(cumInt),
    });
  }
  return rows;
}

export interface Statistiche {
  refDate: Date | null;
  patrimonio: number | null;
  liquidita: number | null;
  nPosizioni: number;
  capitaleNetto: number | null;
  versamenti: number;
  speseCarta: number;
  plComplessivo: number | null;
  rendimentoPct: number | null;
  plLatente: number | null;
  plLatentePct: number | null;
  plRealizzata: number;
  dividendi: number;
  interessi: number;
  bonus: number;
  commissioni: number;
  tasse: number;
  redditoPassivoNetto: number;
  nTx: number;
  nBuy: number;
  nSell: number;
}

const sumAmount = (txs: TxLike[], tipo: string) =>
  txs.filter((t) => t.tipo === tipo).reduce((a, t) => a + (t.amount ?? 0), 0);

export function computeStatistiche(
  txs: TxLike[],
  latest: SnapshotLike | null,
  enriched: EnrichedPosition[],
  realizedByTx: Map<string, number>
): Statistiche {
  const patrimonio = latest?.totalValue ?? null;
  const liquidita = latest?.liquidity ?? null;

  // versamenti/spese allineati alla data del PDF per coerenza con il patrimonio
  const asOf = latest?.refDate ?? null;
  const txAsOf = asOf ? txs.filter((t) => t.date <= asOf) : txs;

  const versamenti = sumAmount(txAsOf, "Versamento");
  const speseCarta = -sumAmount(txAsOf, "Spesa Carta");
  const capitaleNetto = versamenti - speseCarta;

  const dividendi = sumAmount(txs, "Dividendo");
  const interessi = sumAmount(txs, "Interesse");
  const bonus = sumAmount(txs, "Bonus");
  const commissioni = -txs.reduce((a, t) => a + (t.fee ?? 0), 0);
  const tasse = -txs.filter((t) => (t.tax ?? 0) < 0).reduce((a, t) => a + (t.tax ?? 0), 0);
  let plRealizzata = 0;
  for (const v of realizedByTx.values()) plRealizzata += v;

  const valoreCarico = enriched.reduce((a, p) => a + (p.valoreCarico ?? 0), 0) || null;
  const plLatente = enriched.reduce(
    (a, p) => (p.plusMinus != null ? a + p.plusMinus : a),
    0
  );

  const plComplessivo =
    patrimonio != null && capitaleNetto ? patrimonio - capitaleNetto : null;
  const rendimentoPct =
    plComplessivo != null && capitaleNetto ? (plComplessivo / capitaleNetto) * 100 : null;
  const plLatentePct =
    valoreCarico ? (plLatente / valoreCarico) * 100 : null;

  return {
    refDate: latest?.refDate ?? null,
    patrimonio,
    liquidita,
    nPosizioni: enriched.length,
    capitaleNetto: capitaleNetto ? round2(capitaleNetto) : null,
    versamenti: round2(versamenti),
    speseCarta: round2(speseCarta),
    plComplessivo: plComplessivo != null ? round2(plComplessivo) : null,
    rendimentoPct: rendimentoPct != null ? round2(rendimentoPct) : null,
    plLatente: round2(plLatente),
    plLatentePct: plLatentePct != null ? round2(plLatentePct) : null,
    plRealizzata: round2(plRealizzata),
    dividendi: round2(dividendi),
    interessi: round2(interessi),
    bonus: round2(bonus),
    commissioni: round2(commissioni),
    tasse: round2(tasse),
    redditoPassivoNetto: round2(dividendi + interessi - tasse),
    nTx: txs.length,
    nBuy: txs.filter((t) => t.tipo === "Acquisto").length,
    nSell: txs.filter((t) => t.tipo === "Vendita").length,
  };
}
