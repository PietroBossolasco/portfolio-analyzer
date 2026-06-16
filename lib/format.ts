// Helper di formattazione (locale it-IT) e parsing numerico.

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const num4 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 4 });

export function fmtEur(v?: number | null): string {
  return v == null || Number.isNaN(v) ? "—" : eur.format(v);
}
export function fmtNum(v?: number | null, decimals = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return (decimals >= 4 ? num4 : num).format(v);
}
export function fmtPct(v?: number | null): string {
  return v == null || Number.isNaN(v) ? "—" : `${num.format(v)}%`;
}

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function monthLabel(d: Date): string {
  return `${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Converte un numero in formato italiano ("12.483,57") in number. */
export function parseItNumber(raw?: string | null): number | null {
  if (raw == null) return null;
  let s = String(raw).replace(/[A-Za-z€$%\s]/g, "");
  if (!s) return null;
  s = s.replace(/\./g, "").replace(",", ".");
  const v = parseFloat(s);
  return Number.isNaN(v) ? null : v;
}
