import Link from "next/link";
import { getDashboardData } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { Kpi } from "@/components/Kpi";
import { Sensitive } from "@/components/Sensitive";
import { AllocationPie, TrendLine, FlowsBar, PositionsBar } from "@/components/Charts";
import { fmtEur, fmtPct, monthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const d = await getDashboardData(user.id);

  if (!d.hasData) return <EmptyState />;

  const s = d.stats!;
  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 text-white shadow-lift md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/60">Patrimonio totale</div>
            <div className="mt-1 font-display text-4xl font-extrabold tabular-nums"><Sensitive>{fmtEur(s.patrimonio)}</Sensitive></div>
            <p className="mt-2 text-sm text-white/70">
              {s.refDate
                ? `Stato al ${monthLabel(s.refDate)} · ${d.snapshotsCount} estratto/i · ${d.txCount} transazioni`
                : `${d.txCount} transazioni caricate`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${(s.plComplessivo ?? 0) >= 0 ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"}`}>
              {(s.plComplessivo ?? 0) >= 0 ? "▲" : "▼"} {fmtPct(s.rendimentoPct)}
            </span>
            <Link href="/carica" className="rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition hover:bg-white">
              Carica nuovi dati
            </Link>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Valore portafoglio" value={fmtEur(s.patrimonio)} sub="ultimo estratto PDF" accent sensitive />
        <Kpi label="Capitale conferito" value={fmtEur(s.capitaleNetto)} sub="versamenti netti alla data PDF" sensitive />
        <Kpi
          label="Guadagno complessivo"
          value={fmtEur(s.plComplessivo)}
          sub={fmtPct(s.rendimentoPct)}
          tone={(s.plComplessivo ?? 0) >= 0 ? "pos" : "neg"}
          sensitive
        />
        <Kpi
          label="Plus/minus latente"
          value={fmtEur(s.plLatente)}
          sub={fmtPct(s.plLatentePct)}
          tone={(s.plLatente ?? 0) >= 0 ? "pos" : "neg"}
          sensitive
        />
        <Kpi label="Liquidità" value={fmtEur(s.liquidita)} sensitive />
        <Kpi label="Dividendi incassati" value={fmtEur(s.dividendi)} sub="storico" tone="pos" sensitive />
        <Kpi label="Interessi/cedole" value={fmtEur(s.interessi)} sub="storico" tone="pos" sensitive />
        <Kpi
          label="Plus/minus realizzata"
          value={fmtEur(s.plRealizzata)}
          sub="storico"
          tone={s.plRealizzata >= 0 ? "pos" : "neg"}
          sensitive
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="section-title mb-3">Asset Allocation</h2>
          <AllocationPie data={d.allocation} />
        </div>
        <div className="card lg:col-span-2">
          <h2 className="section-title mb-3">Controvalore per titolo</h2>
          <PositionsBar positions={d.positions} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <h2 className="section-title mb-3">Andamento mensile cumulato</h2>
          <TrendLine months={d.months} />
        </div>
        <div className="card">
          <h2 className="section-title mb-3">Flussi mensili</h2>
          <FlowsBar months={d.months} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
        <MiniStat label="Commissioni pagate" value={fmtEur(s.commissioni)} sensitive />
        <MiniStat label="Imposte/bolli" value={fmtEur(s.tasse)} sensitive />
        <MiniStat label="Reddito passivo netto" value={fmtEur(s.redditoPassivoNetto)} sensitive />
        <MiniStat label="Operazioni (buy/sell)" value={`${s.nBuy} / ${s.nSell}`} />
      </section>
    </div>
  );
}

function MiniStat({ label, value, sensitive }: { label: string; value: string; sensitive?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-card">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-display font-semibold text-ink-900">
        {sensitive ? <span className="priv">{value}</span> : value}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-2xl text-white shadow-lift">
        📂
      </div>
      <h1 className="mt-5 text-2xl font-bold text-ink-900">Nessun dato ancora</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Carica i tuoi estratti PDF di Trade Republic e il CSV delle transazioni per
        popolare la dashboard. I dati restano nel tuo database Postgres locale.
      </p>
      <Link href="/carica" className="btn-primary mt-6">
        Carica dati →
      </Link>
    </div>
  );
}
