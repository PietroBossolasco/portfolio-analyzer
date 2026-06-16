import Link from "next/link";
import { getDashboardData } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { fmtEur, fmtNum, fmtPct, monthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PosizioniPage() {
  const user = await requireUser();
  const d = await getDashboardData(user.id);
  if (!d.positions.length) {
    return (
      <Empty msg="Nessuna posizione. Carica un estratto PDF per vederle qui." />
    );
  }

  const tot = d.positions.reduce((a, p) => a + (p.controvalore ?? 0), 0);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Posizioni</h1>
        <p className="text-sm text-slate-500">
          {d.latestRefDate ? `Al ${monthLabel(d.latestRefDate)} · ` : ""}
          {d.positions.length} titoli · totale {fmtEur(tot)}
        </p>
      </header>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Sezione</th>
              <th className="th">ISIN</th>
              <th className="th">Titolo</th>
              <th className="th text-right">Quantità</th>
              <th className="th text-right">Prezzo carico</th>
              <th className="th text-right">Prezzo mercato</th>
              <th className="th text-right">Controvalore</th>
              <th className="th text-right">Plus/Minus</th>
              <th className="th text-right">P/M %</th>
              <th className="th text-right">Peso %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {d.positions.map((p, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="td">{p.sezione}</td>
                <td className="td font-mono text-xs">{p.isin}</td>
                <td className="td">{p.nome}</td>
                <td className="td text-right">{fmtNum(p.quantita, 4)}</td>
                <td className="td text-right">{fmtNum(p.prezzoCarico, 4)}</td>
                <td className="td text-right">{fmtNum(p.prezzoMercato, 4)}</td>
                <td className="td text-right font-medium">{fmtEur(p.controvalore)}</td>
                <td className={`td text-right ${(p.plusMinus ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmtEur(p.plusMinus)}
                </td>
                <td className={`td text-right ${(p.plusMinusPct ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmtPct(p.plusMinusPct)}
                </td>
                <td className="td text-right">{fmtPct(p.peso)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Il prezzo di carico è il costo medio ponderato calcolato dalle transazioni del CSV.
      </p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center text-slate-500">
      <div className="text-4xl">📁</div>
      <p className="mt-3 text-sm">{msg}</p>
      <Link href="/carica" className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
        Carica dati
      </Link>
    </div>
  );
}
