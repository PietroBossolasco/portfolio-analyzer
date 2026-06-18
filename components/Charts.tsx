"use client";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { monthLabel } from "@/lib/format";
import { useHideAmounts } from "@/components/usePrivacy";
import type { MonthRow, EnrichedPosition } from "@/lib/analytics";

const COLORS = ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C9A227", "#10B981"];
const eur = (v: number) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(v) + " €";
// formatter rispettoso della privacy (tooltip)
const mask = (v: number, hide: boolean) => (hide ? "••• €" : eur(v));
const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    boxShadow: "0 6px 24px -8px rgba(16,24,40,.18)",
    fontSize: 12,
  },
} as const;

function labelFromPeriodo(p: string) {
  const [y, m] = p.split("-");
  return monthLabel(new Date(Date.UTC(+y, +m - 1, 1))).replace(/ \d{4}$/, (s) => " '" + s.trim().slice(2));
}

export function AllocationPie({ data }: { data: { categoria: string; valore: number }[] }) {
  const hide = useHideAmounts();
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="valore" nameKey="categoria" cx="50%" cy="50%"
          outerRadius={90} label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => mask(v, hide)} {...TOOLTIP} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ months }: { months: MonthRow[] }) {
  const hide = useHideAmounts();
  if (!months.length) return <Empty />;
  const data = months.map((m) => ({
    name: labelFromPeriodo(m.periodo),
    "Versamenti cumulati": m.versamentiCum,
    "Liquidità calcolata": m.liquidityCalc,
    "Dividendi cumulati": m.dividendiCum,
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (hide ? "" : eur(v))} width={hide ? 30 : 70} />
        <Tooltip formatter={(v: number) => mask(v, hide)} {...TOOLTIP} />
        <Legend />
        <Line type="monotone" dataKey="Versamenti cumulati" stroke="#4F46E5" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="Liquidità calcolata" stroke="#10B981" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="Dividendi cumulati" stroke="#C9A227" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function FlowsBar({ months }: { months: MonthRow[] }) {
  const hide = useHideAmounts();
  if (!months.length) return <Empty />;
  const data = months.map((m) => ({
    name: labelFromPeriodo(m.periodo),
    Dividendi: m.dividendi,
    Interessi: m.interessi,
    Commissioni: m.commissioni,
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} width={hide ? 24 : 50} tickFormatter={(v) => (hide ? "" : String(v))} />
        <Tooltip formatter={(v: number) => mask(v, hide)} {...TOOLTIP} />
        <Legend />
        <Bar dataKey="Dividendi" fill="#C9A227" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Interessi" fill="#10B981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Commissioni" fill="#F43F5E" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PositionsBar({ positions }: { positions: EnrichedPosition[] }) {
  const hide = useHideAmounts();
  if (!positions.length) return <Empty />;
  const data = [...positions]
    .filter((p) => p.controvalore != null)
    .sort((a, b) => (b.controvalore ?? 0) - (a.controvalore ?? 0))
    .map((p) => ({ name: p.nome.length > 26 ? p.nome.slice(0, 24) + "…" : p.nome, Controvalore: p.controvalore }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (hide ? "" : eur(v))} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
        <Tooltip formatter={(v: number) => mask(v, hide)} {...TOOLTIP} />
        <Bar dataKey="Controvalore" fill="#6366F1" radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  const hide = useHideAmounts();
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95}
          paddingAngle={1} label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => mask(v, hide)} {...TOOLTIP} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScoreGauge({ score, band, tone }: { score: number; band: string; tone: string }) {
  const color =
    tone === "great" ? "#10B981" : tone === "ok" ? "#4F46E5" : tone === "warn" ? "#F59E0B" : "#F43F5E";
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div
        className="relative grid h-40 w-40 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #E2E8F0 0deg)` }}
      >
        <div className="grid h-32 w-32 place-items-center rounded-full bg-white">
          <div className="text-center">
            <div className="font-display text-4xl font-extrabold text-ink-900">{score}</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">/ 100</div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm font-semibold" style={{ color }}>
        Diversificazione {band}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
      Nessun dato disponibile
    </div>
  );
}
