// Parser e normalizzazione del CSV "Transaction export" di Trade Republic.
import Papa from "papaparse";

export interface ParsedTx {
  id: string;
  datetime: Date;
  date: Date;
  tipo: string;
  tipoRaw: string;
  categoria: string | null;
  assetClass: string | null;
  nome: string | null;
  isin: string | null;
  shares: number | null;
  price: number | null;
  amount: number | null;
  fee: number | null;
  tax: number | null;
  currency: string | null;
  description: string | null;
}

// Mappa i tipi grezzi del CSV in categorie normalizzate (italiano).
export const TIPO_NORM: Record<string, string> = {
  BUY: "Acquisto",
  SELL: "Vendita",
  DIVIDEND: "Dividendo",
  INTEREST_PAYMENT: "Interesse",
  CUSTOMER_INPAYMENT: "Versamento",
  CUSTOMER_INBOUND: "Versamento",
  TRANSFER_INSTANT_INBOUND: "Versamento",
  FINAL_MATURITY: "Rimborso",
  PRIVATE_MARKET_BUY: "Private Market",
  MIGRATION: "Migrazione",
  STOCKPERK: "Bonus",
  BONUS: "Bonus",
  CARD_TRANSACTION: "Spesa Carta",
  TAX_OPTIMIZATION: "Imposta/Bollo",
};

function toNum(x: unknown): number | null {
  if (x == null || x === "") return null;
  const v = parseFloat(String(x));
  return Number.isNaN(v) ? null : v;
}
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseCsv(content: string): ParsedTx[] {
  const res = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const out: ParsedTx[] = [];
  for (const row of res.data) {
    const id = (row.transaction_id || "").trim();
    if (!id) continue;
    const dt = new Date(row.datetime);
    const d = row.date ? new Date(row.date + "T00:00:00Z") : dt;
    const rawType = (row.type || "").trim();
    out.push({
      id,
      datetime: isNaN(dt.getTime()) ? d : dt,
      date: isNaN(d.getTime()) ? dt : d,
      tipo: TIPO_NORM[rawType] ?? titleCase(rawType),
      tipoRaw: rawType,
      categoria: row.category || null,
      assetClass: row.asset_class || null,
      nome: row.name || null,
      isin: (row.symbol || "").trim() || null,
      shares: toNum(row.shares),
      price: toNum(row.price),
      amount: toNum(row.amount),
      fee: toNum(row.fee),
      tax: toNum(row.tax),
      currency: row.currency || null,
      description: row.description || null,
    });
  }
  // ordine cronologico
  out.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  return out;
}
