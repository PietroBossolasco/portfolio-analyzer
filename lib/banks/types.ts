// Contratto che ogni parser-banca deve implementare. I tipi del risultato
// (ParsedPdf / ParsedTx) sono condivisi: ogni banca, pur leggendo formati diversi,
// produce la stessa struttura normalizzata che alimenta DB e analytics.
import type { ParsedPdf } from "@/lib/parsing/pdf";
import type { ParsedTx } from "@/lib/parsing/csv";

export type { ParsedPdf, ParsedTx };

export interface BankParser {
  id: string;
  /** Interpreta un estratto PDF di stato del portafoglio (se supportato). */
  parsePdf?: (buffer: Buffer, fileName?: string) => Promise<ParsedPdf>;
  /** Interpreta un CSV di transazioni (se supportato). */
  parseCsv?: (content: string) => ParsedTx[];
}
