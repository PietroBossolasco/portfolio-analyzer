// Registro dei parser (lato server). Per aggiungere una banca, importa il suo
// provider e aggiungilo alla mappa: il resto dell'app non cambia.
import type { BankParser } from "@/lib/banks/types";
import { tradeRepublic } from "@/lib/banks/trade-republic";

const REGISTRY: Record<string, BankParser> = {
  [tradeRepublic.id]: tradeRepublic,
  // [fineco.id]: fineco,
  // [directa.id]: directa,
};

export function getParser(id: string): BankParser | undefined {
  return REGISTRY[id];
}
