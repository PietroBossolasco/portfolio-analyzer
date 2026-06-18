import Link from "next/link";
import { getDashboardData } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDiversification } from "@/lib/diversification";
import { ScoreGauge } from "@/components/Charts";
import { BreakdownBars } from "@/components/Breakdown";
import Rebalance from "@/components/Rebalance";
import { PageHeader } from "@/components/PageHeader";
import { fmtEur, fmtNum, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DiversificazionePage() {
  const user = await requireUser();
  const d = await getDashboardData(user.id);

  if (!d.positions.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center text-slate-500">
        <div className="text-4xl">🧭</div>
        <p className="mt-3 text-sm">Carica un estratto PDF per analizzare la diversificazione.</p>
        <Link href="/carica" className="btn-primary mt-4">Carica dati</Link>
      </div>
    );
  }

  const [div, dbUser] = await Promise.all([
    buildDiversification(
      d.positions.map((p) => ({ isin: p.isin, nome: p.nome, sezione: p.sezione, controvalore: p.controvalore })),
      d.stats?.liquidita ?? 0
    ),
    prisma.user.findUnique({ where: { id: user.id }, select: { targetProfile: true } }),
  ]);

  const m = div.metrics;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diversificazione"
        subtitle={`Ripartizione per area, settore e asset class con look-through degli ETF.${div.enrichedExternally ? " Arricchita via OpenFIGI." : ""}`}
      />

      {/* Punteggio + metriche */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col items-center justify-center">
          <ScoreGauge score={div.score} band={div.band} tone={div.tone} />
        </div>
        <div className="card lg:col-span-2">
          <h2 className="section-title mb-4">Indicatori di concentrazione</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric label="Posizioni effettive" value={fmtNum(m.effectiveHoldings)} hint={`su ${m.nPos} titoli`} />
            <Metric label="Prima posizione" value={fmtPct(m.topWeight)} hint="peso del titolo maggiore" />
            <Metric label="Top 3 posizioni" value={fmtPct(m.top3Weight)} hint="peso cumulato" />
            <Metric label="Aree effettive" value={fmtNum(m.effRegions)} hint={m.topRegion ? `top: ${m.topRegion.name}` : ""} />
            <Metric label="Settori effettivi" value={fmtNum(m.effSectors)} hint={m.topSector ? `top: ${m.topSector.name}` : ""} />
            <Metric label="Patrimonio analizzato" value={fmtEur(div.totalPortfolio)} hint="investito + liquidità" sensitive />
          </div>
        </div>
      </section>

      {/* Ripartizioni a barre (leggibili anche con molte categorie) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card">
          <h2 className="section-title mb-4">Per area geografica</h2>
          <BreakdownBars data={div.byRegion} />
        </div>
        <div className="card">
          <h2 className="section-title mb-4">Per settore</h2>
          <BreakdownBars data={div.bySector} />
        </div>
        <div className="card">
          <h2 className="section-title mb-4">Per asset class</h2>
          <BreakdownBars data={div.byAssetClass} />
        </div>
      </section>

      {/* Ribilanciamento verso un profilo target */}
      <section className="card">
        <h2 className="section-title mb-1">Ribilanciamento</h2>
        <p className="mb-4 text-sm text-slate-500">
          Confronta l'allocazione attuale con un profilo target e scopri quanto spostare.
        </p>
        <Rebalance actual={div.byAssetClass} total={div.totalPortfolio} initialProfile={dbUser?.targetProfile ?? "Bilanciato"} />
      </section>

      {/* Valutazione qualitativa */}
      <section className="card">
        <h2 className="section-title mb-4">Valutazione</h2>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
          {div.insights.map((ins, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  ins.kind === "pos"
                    ? "bg-emerald-100 text-emerald-700"
                    : ins.kind === "warn"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-brand-100 text-brand-700"
                }`}
              >
                {ins.kind === "pos" ? "✓" : ins.kind === "warn" ? "!" : "i"}
              </span>
              <span className="text-slate-700">{ins.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-slate-400">
        Le ripartizioni degli ETF ampi (MSCI World, S&amp;P 500, EM IMI, Stoxx Europe 600…) sono stimate
        con composizioni indicative degli indici sottostanti (look-through). Stime informative, non
        consulenza finanziaria.
      </p>
    </div>
  );
}

function Metric({ label, value, hint, sensitive }: { label: string; value: string; hint?: string; sensitive?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-ink-900">
        {sensitive ? <span className="priv">{value}</span> : value}
      </div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
