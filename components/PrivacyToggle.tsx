"use client";

import { useEffect, useState } from "react";

/** Interruttore "Nascondi importi": sfoca gli importi in € in tutta l'app. */
export default function PrivacyToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const active =
      document.documentElement.dataset.privacy === "on" ||
      (typeof localStorage !== "undefined" && localStorage.getItem("privacy") === "on");
    setOn(active);
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    document.documentElement.dataset.privacy = next ? "on" : "off";
    try {
      localStorage.setItem("privacy", next ? "on" : "off");
    } catch {}
    // notifica i grafici SVG (che non possono usare il blur CSS)
    window.dispatchEvent(new Event("privacychange"));
  }

  return (
    <button
      onClick={toggle}
      title={on ? "Mostra importi" : "Nascondi importi"}
      className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
    >
      <span className="flex items-center gap-2">
        {on ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        Importi {on ? "nascosti" : "visibili"}
      </span>
      <span
        className={`relative h-4 w-7 rounded-full transition ${on ? "bg-brand-500" : "bg-slate-600"}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${on ? "left-3.5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

function Eye({ className }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>);
}
function EyeOff({ className }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.42M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 3.4-.65M3 3l18 18" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>);
}
