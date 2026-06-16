export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Pannello brand */}
      <div className="relative hidden overflow-hidden bg-hero-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7" /><path d="M14 7h6v6" /></svg>
          </div>
          <span className="font-display text-xl font-bold">Portfolio Wealth Suite</span>
        </div>
        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold leading-tight text-white">
            Il tuo patrimonio,<br />sotto controllo.
          </h2>
          <p className="mt-4 max-w-sm text-white/70">
            Analizza posizioni, performance e flussi dei tuoi estratti Trade Republic
            in un'unica dashboard. Dati privati, sul tuo database.
          </p>
        </div>
        <div className="relative text-xs text-white/50">
          Stime informative, non consulenza finanziaria.
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-slate-100/70 p-6">
        {children}
      </div>
    </div>
  );
}
