"use client";

import { useState } from "react";

const numFmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const f = (v: number) => (Number.isFinite(v) ? numFmt.format(v) : "—");

function Field({
  label, value, onChange, unit,
}: { label: string; value: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          step="any"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-28 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-right text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {unit && <span className="w-8 text-xs text-slate-400">{unit}</span>}
      </span>
    </label>
  );
}

function Out({ label, value, strong, unit }: { label: string; value: string; strong?: boolean; unit?: string }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${strong ? "font-semibold" : ""}`}>
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm text-slate-900">
        {value} {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </span>
    </div>
  );
}

function Verdict({ ok, mid, text }: { ok: boolean; mid: boolean; text: string }) {
  const cls = ok ? "bg-emerald-100 text-emerald-800" : mid ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-800";
  return <div className={`mt-2 rounded-lg px-3 py-2 text-sm font-semibold ${cls}`}>{text}</div>;
}

export default function CalcolatorePage() {
  // --- Obbligazione ---
  const [bPrice, setBPrice] = useState(99.5);
  const [bCoupon, setBCoupon] = useState(4);
  const [bYears, setBYears] = useState(5);
  const [bFV, setBFV] = useState(100);
  const [bTax, setBTax] = useState(12.5);
  const [bBollo, setBBollo] = useState(0.2);
  const [bBench, setBBench] = useState(3);

  const cedola = (bCoupon * bFV) / 100;
  const currentYield = (cedola / bPrice) * 100;
  const ytmLordo = ((cedola + (bFV - bPrice) / bYears) / ((bFV + bPrice) / 2)) * 100;
  const ytmNetto =
    ((cedola * (1 - bTax / 100) + ((bFV - bPrice) * (1 - bTax / 100)) / bYears) /
      ((bFV + bPrice) / 2)) *
      100 -
    bBollo;
  const bondOk = ytmNetto >= bBench + 1;
  const bondMid = ytmNetto >= bBench - 0.5;

  // --- ETF ---
  const [eImporto, setEImporto] = useState(10000);
  const [eYears, setEYears] = useState(10);
  const [eRet, setERet] = useState(6);
  const [eTer, setETer] = useState(0.2);
  const [eTax, setETax] = useState(26);
  const [eBollo, setEBollo] = useState(0.2);
  const [eBench, setEBench] = useState(4);

  const netAnnual = eRet - eTer - eBollo;
  const vfNoCosti = eImporto * Math.pow(1 + eRet / 100, eYears);
  const vfNetCosti = eImporto * Math.pow(1 + netAnnual / 100, eYears);
  const plusImp = Math.max(vfNetCosti - eImporto, 0);
  const imposte = (plusImp * eTax) / 100;
  const vfNetto = vfNetCosti - imposte;
  const guadagno = vfNetto - eImporto;
  const cagrNetto = (Math.pow(vfNetto / eImporto, 1 / eYears) - 1) * 100;
  const dragCosti = vfNoCosti - vfNetCosti;
  const etfOk = cagrNetto >= eBench + 1;
  const etfMid = cagrNetto >= eBench - 0.5;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Calcolatore — Conviene l’acquisto?</h1>
        <p className="text-sm text-slate-500">
          Modifica i campi <span className="rounded bg-amber-50 px-1 text-amber-700">gialli</span>; i risultati si aggiornano in tempo reale.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* OBBLIGAZIONE */}
        <div className="card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">📈 Obbligazione</h2>
          <div className="divide-y divide-slate-100">
            <Field label="Prezzo di acquisto (% nominale)" value={bPrice} onChange={setBPrice} unit="%" />
            <Field label="Cedola annua lorda" value={bCoupon} onChange={setBCoupon} unit="%" />
            <Field label="Anni alla scadenza" value={bYears} onChange={setBYears} unit="aa" />
            <Field label="Valore di rimborso" value={bFV} onChange={setBFV} />
            <Field label="Aliquota fiscale" value={bTax} onChange={setBTax} unit="%" />
            <Field label="Imposta di bollo annua" value={bBollo} onChange={setBBollo} unit="%" />
            <Field label="Rendimento netto alternativo" value={bBench} onChange={setBBench} unit="%" />
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <Out label="Cedola annua (EUR su 100)" value={f(cedola)} unit="€" />
            <Out label="Rendimento cedolare corrente" value={f(currentYield)} unit="%" />
            <Out label="YTM lordo (a scadenza)" value={f(ytmLordo)} unit="%" />
            <Out label="YTM netto stimato" value={f(ytmNetto)} unit="%" strong />
          </div>
          <Verdict
            ok={bondOk}
            mid={bondMid}
            text={bondOk ? "✅ Interessante" : bondMid ? "➖ In linea col mercato" : "⚠️ Poco interessante"}
          />
        </div>

        {/* ETF */}
        <div className="card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">📊 ETF / Fondo</h2>
          <div className="divide-y divide-slate-100">
            <Field label="Importo da investire" value={eImporto} onChange={setEImporto} unit="€" />
            <Field label="Orizzonte" value={eYears} onChange={setEYears} unit="aa" />
            <Field label="Rendimento lordo annuo atteso" value={eRet} onChange={setERet} unit="%" />
            <Field label="TER (costo annuo)" value={eTer} onChange={setETer} unit="%" />
            <Field label="Aliquota sulla plusvalenza" value={eTax} onChange={setETax} unit="%" />
            <Field label="Imposta di bollo annua" value={eBollo} onChange={setEBollo} unit="%" />
            <Field label="Rendimento netto alternativo" value={eBench} onChange={setEBench} unit="%" />
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <Out label="Rendimento netto annuo (post costi)" value={f(netAnnual)} unit="%" />
            <Out label="Valore finale netto" value={f(vfNetto)} unit="€" strong />
            <Out label="Guadagno netto totale" value={f(guadagno)} unit="€" />
            <Out label="CAGR netto" value={f(cagrNetto)} unit="%" strong />
            <Out label="Costo totale (drag TER+bollo)" value={f(dragCosti)} unit="€" />
          </div>
          <Verdict
            ok={etfOk}
            mid={etfMid}
            text={etfOk ? "✅ Conveniente" : etfMid ? "➖ In linea col mercato" : "⚠️ Poco conveniente"}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Stime semplificate a scopo informativo, non consulenza finanziaria. Le imposte effettive
        dipendono dalla tua situazione. Valuta anche rating dell’emittente, rischio tasso, dimensione
        del fondo e tipo di replica.
      </p>
    </div>
  );
}
