// Parser dei PDF "Estratto del patrimonio netto" di Trade Republic.
// Tarato sull'estrazione testo di pdf-parse (layout a colonne impilate).

// @ts-ignore - pdf-parse non ha tipi ufficiali; importiamo il modulo interno
// per evitare il codice di debug del wrapper index.js.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { parseItNumber } from "@/lib/format";

export interface ParsedPosition {
  sezione: string;
  isin: string;
  nome: string;
  quantita: number | null;
  prezzoMercato: number | null;
  controvalore: number | null;
  peso: number | null;
}

export interface ParsedPdf {
  refDate: Date | null;
  totalValue: number | null;
  liquidity: number | null;
  allocConto: number | null;
  allocPrivate: number | null;
  allocReddito: number | null;
  positions: ParsedPosition[];
}

const ISIN_RE = /\b([A-Z]{2}[A-Z0-9]{9}\d)\b/;
const POS_HEADER_RE = /^([\d.]+,\d+|\d+)\s+(pezzi|EUR|USD|CHF|GBP)(.*)$/;
const NUM_LINE_RE = /^[\d.]+,\d+$/;
const DATE_LINE_RE = /^\d{2}\.\d{2}\.\d{4}$/;

const SEZIONI: Record<string, string> = {
  "CONTO TITOLI": "Conto Titoli",
  "PRIVATE MARKETS": "Private Markets",
  "REDDITO FISSO": "Reddito Fisso",
};

function parseRefDate(text: string): Date | null {
  const m =
    text.match(/al giorno\s+(\d{2})\.(\d{2})\.(\d{4})/) ||
    text.match(/\bal\s+(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d));
}

interface RawPos {
  sezione: string;
  qty: number | null;
  nameParts: string[];
  isin: string | null;
  nums: number[];
}

export async function parsePdf(buffer: Buffer, fileName?: string): Promise<ParsedPdf> {
  const data = await pdfParse(buffer);
  const text: string = data.text;

  const refDate = parseRefDate(text);

  const summary: Record<string, number | null> = {};
  const sumPairs: [string, RegExp][] = [
    ["conto", /Conto titoli([\d.]+,\d+)/],
    ["private", /Private Markets([\d.]+,\d+)/],
    ["reddito", /Reddito fisso([\d.]+,\d+)/],
    ["liq", /Liquidità([\d.]+,\d+)/],
    ["total", /TOTAL([\d.]+,\d+)/],
  ];
  for (const [k, re] of sumPairs) {
    const m = text.match(re);
    summary[k] = m ? parseItNumber(m[1]) : null;
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let sezione: string | null = null;
  let cur: RawPos | null = null;
  const raw: RawPos[] = [];
  const flush = () => {
    if (cur) raw.push(cur);
    cur = null;
  };

  for (const ln of lines) {
    const up = ln.toUpperCase();
    if (up === "CONTO TITOLI" || up === "PRIVATE MARKETS" || up === "REDDITO FISSO") {
      flush();
      sezione = SEZIONI[up];
      continue;
    }
    if (up.startsWith("LIQUIDIT")) {
      flush();
      sezione = null;
      continue;
    }
    if (!sezione) continue;
    if (ln.startsWith("NUMERO DI POSIZIONI")) {
      flush();
      continue;
    }
    const h = POS_HEADER_RE.exec(ln);
    if (h) {
      flush();
      cur = {
        sezione,
        qty: parseItNumber(h[1]),
        nameParts: [h[3].trim()].filter(Boolean),
        isin: null,
        nums: [],
      };
      continue;
    }
    if (!cur) continue;
    const mi = ISIN_RE.exec(ln);
    if (/ISIN/i.test(ln) && mi) {
      cur.isin = mi[1];
      continue;
    }
    if (NUM_LINE_RE.test(ln)) {
      const v = parseItNumber(ln);
      if (v != null) cur.nums.push(v);
      continue;
    }
    if (DATE_LINE_RE.test(ln)) continue;
    if (/^(Conto titoli|Luogo di custodia)/i.test(ln)) continue;
    // riga di continuazione del nome (prima dell'ISIN)
    if (cur.isin == null && ln) cur.nameParts.push(ln);
  }
  flush();

  const base =
    summary.total ??
    (["conto", "private", "reddito"]
      .map((k) => summary[k] ?? 0)
      .reduce((a, b) => a + b, 0) || null);

  const positions: ParsedPosition[] = raw
    .filter((p) => p.isin || p.nums.length)
    .map((p) => {
      const prezzoMercato = p.nums.length ? p.nums[0] : null;
      const controvalore = p.nums.length ? p.nums[p.nums.length - 1] : null;
      const peso =
        controvalore != null && base ? Math.round((controvalore / base) * 10000) / 100 : null;
      return {
        sezione: p.sezione,
        isin: p.isin ?? "",
        nome: p.nameParts.join(" ").trim() || p.isin || "?",
        quantita: p.qty,
        prezzoMercato,
        controvalore,
        peso,
      };
    });

  return {
    refDate,
    totalValue: summary.total,
    liquidity: summary.liq,
    allocConto: summary.conto,
    allocPrivate: summary.private,
    allocReddito: summary.reddito,
    positions,
  };
}
