"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setBusy(true);
    await fetch("/api/account", { method: "DELETE" });
    router.push("/register");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn-ghost border-rose-200 text-rose-600 hover:bg-rose-50">
        Elimina account
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-rose-700">Sei sicuro? Tutti i tuoi dati verranno eliminati definitivamente.</span>
      <button onClick={remove} disabled={busy} className="btn bg-rose-600 text-white hover:bg-rose-700">
        {busy ? "Eliminazione…" : "Sì, elimina tutto"}
      </button>
      <button onClick={() => setConfirming(false)} disabled={busy} className="btn-ghost">
        Annulla
      </button>
    </div>
  );
}
