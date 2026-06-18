"use client";

import { useEffect, useState } from "react";

/**
 * Stato della modalità privacy lato client (per i grafici SVG, dove il blur CSS
 * non si applica). Si aggiorna quando PrivacyToggle emette l'evento 'privacychange'.
 */
export function useHideAmounts(): boolean {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const read = () => setHide(document.documentElement.dataset.privacy === "on");
    read();
    window.addEventListener("privacychange", read);
    return () => window.removeEventListener("privacychange", read);
  }, []);
  return hide;
}
