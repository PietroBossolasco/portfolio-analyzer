// Catalogo delle banche supportate — SOLE METADATI (nessun parser, nessuna
// dipendenza pesante): importabile anche lato client per il selettore.
// Aggiungere una banca: 1) qui i metadati, 2) un provider in lib/banks/<id>.ts,
// 3) registrarlo in lib/banks/registry.ts.

export interface BankInfo {
  id: string;
  label: string;
  enabled: boolean;
  formats: { pdf: boolean; csv: boolean };
  note?: string;
}

export const BANKS: BankInfo[] = [
  { id: "trade-republic", label: "Trade Republic", enabled: true, formats: { pdf: true, csv: true } },
  { id: "fineco", label: "Fineco", enabled: false, formats: { pdf: true, csv: true }, note: "in arrivo" },
  { id: "directa", label: "Directa", enabled: false, formats: { pdf: true, csv: true }, note: "in arrivo" },
  { id: "degiro", label: "DEGIRO", enabled: false, formats: { pdf: false, csv: true }, note: "in arrivo" },
  { id: "scalable", label: "Scalable Capital", enabled: false, formats: { pdf: true, csv: true }, note: "in arrivo" },
];

export const DEFAULT_BANK = "trade-republic";

export function getBankInfo(id: string): BankInfo | undefined {
  return BANKS.find((b) => b.id === id);
}
