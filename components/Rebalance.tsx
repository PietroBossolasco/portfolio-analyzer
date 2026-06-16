"use client";

import { useMemo, useState } from "react";
import { fmtEur } from "@/lib/format";

interface Slice { name: string; value: number; pct: number }

const CLASSES = ["Azionario", "Obbligazionario", "Alternativi", "Liquidità"] as const;
type Cls = (typeof CLASSES)[number];
type Mix = Record<Cls, number>;

const PROFILES: Record<string, Mix> = {
  Prudente: { Azionario: 30, Obbligazionario: 55, Alternativi: 5, Liquidità: 10 },
  Bilanciato: { Azionario: 55, Obbligazionario: 30, Alternativi: 10, Liquidità: 5 },
  Dinamico: { Azionario: 75, Obbligazionario: 15, Alternativi: 7, Liquidità: 3 },
};

export default function Rebalance({
  actual,
  total,
  initialProfile = "Bilanciato",
}: {
  actual: Slice[];
  total: number;
  initialProfile?: string;
}) {
  const [profile, setProfile] = useState<string>(
    PROFILES[initialProfile] ? initialProfile : "Bilanciato"
  );
  const [saving, setSaving] = useState(false);

  function selectProfile(p: string) {
    setProfile(p);
    setSaving(true);
    fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: p }),
    }).finally(() => setSaving(false));
  }

  const actualMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of actual) m[s.name] = s.value;
    return m;
  }, [actual]);

  const target = PROFILES[profile];
  const rows = CLASSES.map((c) => {
    const actualValue = actualMap[c] ?? 0;
    const actualPct = total ? (actualValue / total) * 100 : 0;
    const targetPct = target[c];
    const targetValue = (targetPct / 100) * total;
    const delta = targetValue - actualValue; // >0 = aumenta, <0 = riduci
    return { c, actualPct, targetPct, delta };
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Profilo target:</span>
        {Object.keys(PROFILES).map((p) => (
          <button
            key={p}
            onClick={() => selectProfile(p)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              profile === p ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p}
          </button>
        ))}
        {saving && <span className="text-xs text-slate-400">salvataggio…</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-3">Asset class</th>
              <th className="py-2 pr-3 text-right">Attuale</th>
              <th className="py-2 pr-3 text-right">Target</th>
              <th className="py-2 pr-3 text-right">Scostamento</th>
              <th className="py-2 text-right">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const driftPp = r.actualPct - r.targetPct;
              const aligned = Math.abs(driftPp) < 1.5;
              return (
                <tr key={r.c}>
                  <td className="py-2.5 pr-3 font-medium text-slate-700">{r.c}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{r.actualPct.toFixed(1)}%</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">{r.targetPct}%</td>
                  <td className={`py-2.5 pr-3 text-right tabular-nums ${aligned ? "text-slate-400" : driftPp > 0 ? "text-amber-600" : "text-sky-600"}`}>
                    {driftPp > 0 ? "+" : ""}{driftPp.toFixed(1)} pp
                  </td>
                  <td className="py-2.5 text-right">
                    {aligned ? (
                      <span className="badge-pos">✓ allineato</span>
                    ) : r.delta > 0 ? (
                      <span className="badge bg-emerald-50 text-emerald-700">+ {fmtEur(r.delta)}</span>
                    ) : (
                      <span className="badge bg-rose-50 text-rose-700">− {fmtEur(Math.abs(r.delta))}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        L'azione indica quanto investire (+) o ridurre (−) per avvicinarsi al profilo scelto.
        Tolleranza ±1,5 punti percentuali.
      </p>
    </div>
  );
}
