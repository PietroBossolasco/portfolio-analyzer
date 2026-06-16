"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { email, password, name } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      const next = params.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center lg:hidden">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient shadow-lift">
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7" /><path d="M14 7h6v6" /></svg>
        </div>
      </div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          {isRegister ? "Crea il tuo account" : "Bentornato"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isRegister ? "Bastano email e password per iniziare." : "Accedi per vedere il tuo patrimonio."}
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4">
        {isRegister && (
          <div>
            <label className="label">Nome (opzionale)</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRegister ? "Almeno 8 caratteri" : "••••••••"}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Attendere…" : isRegister ? "Registrati" : "Accedi"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        {isRegister ? (
          <>
            Hai già un account?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">Accedi</Link>
          </>
        ) : (
          <>
            Non hai un account?{" "}
            <Link href="/register" className="font-semibold text-brand-600 hover:underline">Registrati</Link>
          </>
        )}
      </p>
    </div>
  );
}
