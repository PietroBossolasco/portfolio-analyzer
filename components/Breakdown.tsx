// Lista di barre orizzontali ordinate per ripartizioni con molte categorie:
// più leggibile di un donut quando le voci sono numerose (es. settori).
import { fmtEur } from "@/lib/format";

const COLORS = [
  "#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C9A227", "#10B981",
  "#0EA5E9", "#F59E0B", "#EC4899", "#14B8A6", "#8B5CF6", "#64748B", "#F43F5E",
];

export interface BreakdownItem {
  name: string;
  value: number;
  pct: number;
}

export function BreakdownBars({
  data,
  showValue = true,
}: {
  data: BreakdownItem[];
  showValue?: boolean;
}) {
  if (!data.length) {
    return <div className="py-10 text-center text-sm text-slate-400">Nessun dato</div>;
  }
  const top = Math.max(...data.map((d) => d.pct), 1);

  return (
    <div className="space-y-3">
      {data.map((s, i) => {
        const color = COLORS[i % COLORS.length];
        return (
          <div key={s.name}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 truncate text-slate-600">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
                <span className="truncate">{s.name}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {showValue && <span className="priv text-xs text-slate-400">{fmtEur(s.value)}</span>}
                <span className="w-12 text-right font-semibold tabular-nums text-ink-900">{s.pct}%</span>
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(s.pct / top) * 100}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
