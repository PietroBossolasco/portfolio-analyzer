"use client";

import { useMemo, useState } from "react";
import { fmtEur, fmtNum } from "@/lib/format";

const TIPO_STYLE: Record<string, string> = {
  Acquisto: "bg-brand-50 text-brand-700",
  Vendita: "bg-amber-50 text-amber-700",
  Dividendo: "bg-emerald-50 text-emerald-700",
  Interesse: "bg-emerald-50 text-emerald-700",
  Versamento: "bg-sky-50 text-sky-700",
  Rimborso: "bg-sky-50 text-sky-700",
  "Imposta/Bollo": "bg-rose-50 text-rose-700",
  "Spesa Carta": "bg-rose-50 text-rose-700",
};
function TipoBadge({ tipo }: { tipo: string }) {
  return <span className={`badge ${TIPO_STYLE[tipo] ?? "bg-slate-100 text-slate-600"}`}>{tipo}</span>;
}

export interface TxView {
  date: string;
  tipo: string;
  isin: string | null;
  nome: string | null;
  shares: number | null;
  price: number | null;
  amount: number | null;
  fee: number | null;
  tax: number | null;
  realized: number | null;
  description: string | null;
}

export default function TransactionsTable({ rows }: { rows: TxView[] }) {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("Tutti");

  const tipi = useMemo(
    () => ["Tutti", ...Array.from(new Set(rows.map((r) => r.tipo))).sort()],
    [rows]
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tipo !== "Tutti" && r.tipo !== tipo) return false;
      if (!ql) return true;
      return (
        (r.nome ?? "").toLowerCase().includes(ql) ||
        (r.isin ?? "").toLowerCase().includes(ql) ||
        (r.description ?? "").toLowerCase().includes(ql)
      );
    });
  }, [rows, q, tipo]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Cerca titolo, ISIN o descrizione…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input max-w-[200px]" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {tipi.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">{filtered.length} movimenti</span>
      </div>

      <div className="card max-h-[70vh] overflow-auto p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th className="th">Data</th>
              <th className="th">Tipo</th>
              <th className="th">Titolo</th>
              <th className="th">ISIN</th>
              <th className="th text-right">Quantità</th>
              <th className="th text-right">Prezzo</th>
              <th className="th text-right">Importo</th>
              <th className="th text-right">Comm.</th>
              <th className="th text-right">Realizzato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap text-slate-500">{r.date}</td>
                <td className="td whitespace-nowrap"><TipoBadge tipo={r.tipo} /></td>
                <td className="td">{r.nome ?? "—"}</td>
                <td className="td font-mono text-xs">{r.isin ?? "—"}</td>
                <td className="td text-right">{fmtNum(r.shares, 4)}</td>
                <td className="td text-right">{fmtNum(r.price, 4)}</td>
                <td className={`td text-right ${(r.amount ?? 0) >= 0 ? "text-emerald-700" : "text-slate-700"}`}>
                  {fmtEur(r.amount)}
                </td>
                <td className="td text-right">{fmtEur(r.fee)}</td>
                <td className={`td text-right ${r.realized == null ? "" : r.realized >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {r.realized == null ? "—" : fmtEur(r.realized)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
