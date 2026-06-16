// Arricchimento opzionale tramite OpenFIGI (API esterna gratuita, no API key per
// volumi bassi): mappa un ISIN al tipo di strumento, utile per classificare titoli
// SCONOSCIUTI non presenti nella mappa di riferimento.
// È best-effort: timeout breve, errori ignorati (fallback alla classificazione locale).
import type { AssetClass } from "@/lib/classify";

const ENDPOINT = "https://api.openfigi.com/v3/mapping";
const cache = new Map<string, OpenFigiInfo>();

export interface OpenFigiInfo {
  name?: string;
  assetClass?: AssetClass;
  securityType?: string;
  marketSector?: string;
}

function mapAssetClass(marketSector?: string, securityType?: string): AssetClass | undefined {
  const m = (marketSector ?? "").toLowerCase();
  const t = (securityType ?? "").toLowerCase();
  if (m.includes("govt") || m.includes("corp") || t.includes("bond") || t.includes("note")) return "Obbligazionario";
  if (m.includes("equity") || t.includes("etp") || t.includes("fund") || t.includes("share")) return "Azionario";
  return undefined;
}

/**
 * Arricchisce un insieme di ISIN. Restituisce solo quelli risolti.
 * Non lancia eccezioni: in caso di rete assente / rate limit, ritorna ciò che ha.
 */
export async function enrichIsins(isins: string[]): Promise<Map<string, OpenFigiInfo>> {
  const result = new Map<string, OpenFigiInfo>();
  const todo = Array.from(new Set(isins.filter(Boolean))).filter((i) => !cache.has(i));

  // servi subito quelli già in cache
  for (const i of isins) if (cache.has(i)) result.set(i, cache.get(i)!);
  if (todo.length === 0) return result;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo.map((id) => ({ idType: "ID_ISIN", id }))),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return result;
    const data = (await res.json()) as Array<{ data?: any[]; error?: string }>;
    data.forEach((entry, idx) => {
      const isin = todo[idx];
      const first = entry?.data?.[0];
      if (!first) {
        cache.set(isin, {});
        return;
      }
      const info: OpenFigiInfo = {
        name: first.name,
        securityType: first.securityType,
        marketSector: first.marketSector,
        assetClass: mapAssetClass(first.marketSector, first.securityType),
      };
      cache.set(isin, info);
      result.set(isin, info);
    });
  } catch {
    // rete non disponibile / timeout: si prosegue con la classificazione locale
  }
  return result;
}
