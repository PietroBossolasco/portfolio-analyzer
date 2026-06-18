import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardData, getTransactions } from "@/lib/data";
import { buildDiversification } from "@/lib/diversification";
import { computeHealthCheck, type HealthDimension } from "@/lib/healthcheck";
import { ScoreGauge } from "@/components/Charts";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ValutazionePage() {
  const user = await requireUser();
  const [d, txs, dbUser] = await Promise.all([
    getDashboardData(user.id),
    getTransactions(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { targetProfile: true } }),
  ]);

  if (!d.hasData || !d.stats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center text-slate-500">
        <div className="text-4xl">🩺</div>
        <p className="mt-3 text-sm">Carica i tuoi dati per ottenere la valutazione del portafoglio.</p>
        <Link href="/carica" className="btn-primary mt-4">Carica dati</Link>
      </div>
    );
  }

  const div = await buildDiversification(
    d.positions.map((p) => ({ isin: p.isin, nome: p.nome, sezione: p.sezione, controvalore: p.controvalore })),
    d.stats.liquidita ?? 0
  );

  // metriche comportamentali
  const dated = txs.filter((t) => t.datetime);
  const first = dated.length ? dated[0].datetime.getTime() : Date.now();
  const last = dated.length ? dated[dated.length - 1].datetime.getTime() : Date.now();
  const yearsActive = Math.max((last - first) / (365.25 * 24 * 3600 * 1000), 0.5);
  const behavior = {
    monthsTotal: d.months.length,
    monthsWithContrib: d.months.filter((m) => m.versamenti > 0).length,
    tradesPerYear: (d.stats.nBuy + d.stats.nSell) / yearsActive,
    realizedLossCount: txs.filter((t) => t.realized != null && t.realized < 0).length,
    yearsActive,
  };

  const hc = computeHealthCheck({
    stats: d.stats,
    div,
    positions: d.positions.map((p) => ({ isin: p.isin, nome: p.nome, sezione: p.sezione, controvalore: p.controvalore })),
    targetProfile: dbUser?.targetProfile ?? "Bilanciato",
    behavior,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Valutazione del portafoglio"
        subtitle="Analisi su 8 dimensioni con consigli pratici di finanza personale."
      />

      {/* Punteggio complessivo */}
      <section className="card grid grid-cols-1 items-center gap-6 md:grid-cols-3">
        <div className="flex justify-center">
          <ScoreGauge score={hc.overall} band={hc.band} tone={hc.tone} />
        </div>
        <div className="md:col-span-2">
          <h2 className="font-display text-xl font-bold text-ink-900">{hc.headline}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="badge-brand">Rendimento annuo ≈ {hc.annualReturnPct ?? "—"}%</span>
            <span className="badge-neutral">TER medio ≈ {hc.estimatedTer}%</span>
            <span className="badge-neutral">Rendita ≈ {hc.passiveYieldPct}%</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Il punteggio pondera diversificazione, allocazione, costi, concentrazione, liquidità,
            performance, disciplina e reddito passivo.
          </p>
        </div>
      </section>

      {/* Piano d'azione */}
      {hc.actions.length > 0 && (
        <section className="card">
          <h2 className="section-title mb-4">Piano d'azione consigliato</h2>
          <ol className="space-y-3">
            {hc.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.priority === "alta" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                  {a.priority === "alta" ? "Priorità alta" : "Priorità media"}
                </span>
                <span className="text-sm text-slate-700">
                  <span className="font-medium text-slate-500">{a.area}:</span> {a.text}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Dimensioni */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {hc.dimensions.map((dim) => (
          <DimensionCard key={dim.key} dim={dim} />
        ))}
      </section>

      <p className="text-xs text-slate-400">
        Valutazione educativa basata su euristiche di finanza personale e sui dati caricati;
        non costituisce consulenza finanziaria personalizzata. Le scelte dipendono dai tuoi
        obiettivi, dal tuo orizzonte temporale e dalla tua tolleranza al rischio.
      </p>
    </div>
  );
}

function DimensionCard({ dim }: { dim: HealthDimension }) {
  const color =
    dim.status === "good" ? "#10B981" : dim.status === "warn" ? "#F59E0B" : "#F43F5E";
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-900">{dim.label}</h3>
        <span className="font-display text-lg font-bold tabular-nums" style={{ color }}>
          {dim.score}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${dim.score}%`, background: color }} />
      </div>
      <p className="mt-3 text-sm text-slate-600">{dim.summary}</p>
      <ul className="mt-3 space-y-2">
        {dim.tips.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-600">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${t.priority === "alta" ? "bg-rose-500" : t.priority === "media" ? "bg-amber-500" : "bg-brand-400"}`} />
            <span>{t.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
