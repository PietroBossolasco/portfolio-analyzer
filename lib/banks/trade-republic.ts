// Provider Trade Republic: delega ai parser esistenti.
// Modello da replicare per nuove banche (es. lib/banks/fineco.ts).
import type { BankParser } from "@/lib/banks/types";
import { parsePdf } from "@/lib/parsing/pdf";
import { parseCsv } from "@/lib/parsing/csv";

export const tradeRepublic: BankParser = {
  id: "trade-republic",
  parsePdf,
  parseCsv,
};
