export function Kpi({
  label,
  value,
  sub,
  tone = "default",
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "pos" | "neg";
  accent?: boolean;
}) {
  const valueCls =
    tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-rose-600" : "text-ink-900";

  const subEl =
    sub == null ? null : tone === "default" ? (
      <div className="mt-1.5 text-xs text-slate-400">{sub}</div>
    ) : (
      <div className="mt-2">
        <span className={tone === "pos" ? "badge-pos" : "badge-neg"}>
          <span aria-hidden>{tone === "pos" ? "▲" : "▼"}</span>
          {sub}
        </span>
      </div>
    );

  return (
    <div
      className={`card card-hover relative overflow-hidden ${
        accent ? "ring-1 ring-brand-200" : ""
      }`}
    >
      {accent && <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />}
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className={`mt-1.5 font-display text-2xl font-bold tabular-nums ${valueCls}`}>
        {value}
      </div>
      {subEl}
    </div>
  );
}
