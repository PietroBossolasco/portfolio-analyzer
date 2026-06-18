"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BANKS, DEFAULT_BANK } from "@/lib/banks/catalog";

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [bank, setBank] = useState(DEFAULT_BANK);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const bankInfo = BANKS.find((b) => b.id === bank);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter(
      (f) => f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".csv")
    );
    setFiles((prev) => {
      const names = new Set(prev.map((p) => p.name));
      return [...prev, ...arr.filter((a) => !names.has(a.name))];
    });
  }

  async function submit() {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("bank", bank);
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore durante il caricamento");
      const parts = [
        data.pdfCount ? `${data.pdfCount} PDF (${data.positionCount} posizioni)` : null,
        data.txCount ? `${data.txCount} transazioni` : null,
      ].filter(Boolean);
      setResult(`Importati: ${parts.join(" · ") || "nessun nuovo dato"}.`);
      if (data.errors?.length) setError(data.errors.join("\n"));
      setFiles([]);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!confirm("Svuotare tutto il database?")) return;
    setBusy(true);
    await fetch("/api/upload", { method: "DELETE" });
    setResult("Database svuotato.");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Selettore banca */}
      <div>
        <label className="label">Banca / broker</label>
        <div className="flex flex-wrap gap-2">
          {BANKS.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={!b.enabled}
              onClick={() => b.enabled && setBank(b.id)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                bank === b.id
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500/30"
                  : b.enabled
                  ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              {b.label}
              {!b.enabled && <span className="ml-1.5 text-[10px] uppercase tracking-wide">· {b.note}</span>}
            </button>
          ))}
        </div>
        {bankInfo && (
          <p className="mt-1.5 text-xs text-slate-400">
            Formati supportati: {[bankInfo.formats.pdf && "PDF", bankInfo.formats.csv && "CSV"].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:bg-slate-50"
        }`}
      >
        <div className="text-4xl">⬆️</div>
        <p className="mt-2 font-medium text-slate-700">Trascina qui i file, o clicca per selezionarli</p>
        <p className="text-xs text-slate-400">Estratti PDF e/o il CSV delle transazioni</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.csv"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="card divide-y divide-slate-100 p-0 text-sm">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-2">
              <span>{f.name.toLowerCase().endsWith(".pdf") ? "📄" : "🧾"} {f.name}</span>
              <button
                onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                className="text-xs text-red-500 hover:underline"
              >
                rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={busy || !files.length} className="btn-primary">
          {busy ? "Elaborazione…" : "Carica e analizza"}
        </button>
        <button onClick={reset} disabled={busy} className="text-sm text-slate-500 hover:text-rose-600">
          Svuota database
        </button>
      </div>

      {result && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{result}</div>}
      {error && <pre className="whitespace-pre-wrap rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</pre>}
    </div>
  );
}
