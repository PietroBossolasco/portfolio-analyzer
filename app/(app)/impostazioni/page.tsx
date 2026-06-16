import { requireUser } from "@/lib/auth";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import DeleteAccountButton from "@/components/DeleteAccountButton";

export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  const user = await requireUser();

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-900">Impostazioni</h1>
        <p className="text-sm text-slate-500">Gestisci account, sicurezza e dati.</p>
      </header>

      {/* Account */}
      <section className="card">
        <h2 className="section-title mb-4">Account</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-400">Nome</dt>
            <dd className="text-sm font-medium text-slate-800">{user.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-400">Email</dt>
            <dd className="text-sm font-medium text-slate-800">{user.email}</dd>
          </div>
        </dl>
      </section>

      {/* Sicurezza */}
      <section className="card">
        <h2 className="section-title mb-4">Sicurezza</h2>
        <ChangePasswordForm />
      </section>

      {/* Dati */}
      <section className="card">
        <h2 className="section-title mb-2">Esporta i tuoi dati</h2>
        <p className="mb-4 text-sm text-slate-500">
          Scarica le tue informazioni in chiaro. I dati sul server restano cifrati.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/api/account/export?format=csv" className="btn-ghost">⬇ Transazioni (CSV)</a>
          <a href="/api/account/export?format=json" className="btn-ghost">⬇ Esporta tutto (JSON)</a>
        </div>
      </section>

      {/* Zona pericolo */}
      <section className="card border-rose-200">
        <h2 className="section-title mb-2">Zona pericolo</h2>
        <p className="mb-4 text-sm text-slate-500">
          L'eliminazione dell'account rimuove definitivamente tutti gli estratti, le posizioni e le transazioni.
        </p>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
