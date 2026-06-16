// Strato di accesso ai dati: legge da Postgres (Prisma), DECIFRA i campi
// sensibili e calcola le metriche derivate da mostrare nelle pagine.
import { prisma } from "@/lib/prisma";
import { decrypt, decNum } from "@/lib/crypto";
import {
  computeCostBasis,
  enrichPositions,
  monthlySynthesis,
  computeStatistiche,
  type EnrichedPosition,
  type MonthRow,
  type Statistiche,
  type TxLike,
  type SnapshotLike,
  type PositionLike,
} from "@/lib/analytics";

export interface DashboardData {
  hasData: boolean;
  stats: Statistiche | null;
  months: MonthRow[];
  positions: EnrichedPosition[];
  allocation: { categoria: string; valore: number }[];
  latestRefDate: Date | null;
  snapshotsCount: number;
  txCount: number;
}

// --- mapper di decifratura (riga DB cifrata → oggetto in chiaro) --- //

interface DbTx {
  id: string; datetime: Date; date: Date; tipo: string; tipoRaw: string;
  categoria: string | null; assetClass: string | null; currency: string | null;
  nome: string | null; isin: string | null;
  shares: string | null; price: string | null; amount: string | null;
  fee: string | null; tax: string | null; description: string | null;
}
interface DbPosition {
  sezione: string; isin: string; nome: string;
  quantita: string | null; prezzoMercato: string | null;
  controvalore: string | null; peso: string | null;
}
interface DbSnapshot {
  refDate: Date; totalValue: string | null; liquidity: string | null;
  allocConto: string | null; allocPrivate: string | null; allocReddito: string | null;
  positions: DbPosition[];
}

interface PlainTx extends TxLike {
  categoria: string | null;
  assetClass: string | null;
  currency: string | null;
  description: string | null;
}

function decryptTx(t: DbTx): PlainTx {
  return {
    id: t.id,
    datetime: t.datetime,
    date: t.date,
    tipo: t.tipo,
    tipoRaw: t.tipoRaw,
    categoria: t.categoria,
    assetClass: t.assetClass,
    currency: t.currency,
    isin: decrypt(t.isin),
    nome: decrypt(t.nome),
    shares: decNum(t.shares),
    price: decNum(t.price),
    amount: decNum(t.amount),
    fee: decNum(t.fee),
    tax: decNum(t.tax),
    description: decrypt(t.description),
  };
}

function decryptPosition(p: DbPosition): PositionLike {
  return {
    sezione: p.sezione,
    isin: decrypt(p.isin) ?? "",
    nome: decrypt(p.nome) ?? "",
    quantita: decNum(p.quantita),
    prezzoMercato: decNum(p.prezzoMercato),
    controvalore: decNum(p.controvalore),
    peso: decNum(p.peso),
  };
}

function decryptSnapshot(s: DbSnapshot): SnapshotLike {
  return {
    refDate: s.refDate,
    totalValue: decNum(s.totalValue),
    liquidity: decNum(s.liquidity),
    allocConto: decNum(s.allocConto),
    allocPrivate: decNum(s.allocPrivate),
    allocReddito: decNum(s.allocReddito),
    positions: s.positions.map(decryptPosition),
  };
}

async function loadRaw(userId: string) {
  const [snapshots, txs] = await Promise.all([
    prisma.snapshot.findMany({
      where: { userId },
      orderBy: { refDate: "asc" },
      include: { positions: true },
    }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { datetime: "asc" } }),
  ]);
  return {
    snapshots: (snapshots as unknown as DbSnapshot[]).map(decryptSnapshot),
    txs: (txs as unknown as DbTx[]).map(decryptTx),
  };
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const { snapshots, txs } = await loadRaw(userId);
  const hasData = snapshots.length > 0 || txs.length > 0;

  const { basis, realizedByTx } = computeCostBasis(txs);
  const months = monthlySynthesis(txs, snapshots);

  const latest = snapshots.length ? snapshots[snapshots.length - 1] : null;
  const positions = latest ? enrichPositions(latest.positions, basis) : [];
  const stats = computeStatistiche(txs, latest, positions, realizedByTx);

  const allocation = latest
    ? [
        { categoria: "Azionario / ETF", valore: latest.allocConto ?? 0 },
        { categoria: "Private Markets", valore: latest.allocPrivate ?? 0 },
        { categoria: "Reddito Fisso", valore: latest.allocReddito ?? 0 },
        { categoria: "Liquidità", valore: latest.liquidity ?? 0 },
      ].filter((a) => a.valore > 0)
    : [];

  return {
    hasData,
    stats: hasData ? stats : null,
    months,
    positions,
    allocation,
    latestRefDate: latest?.refDate ?? null,
    snapshotsCount: snapshots.length,
    txCount: txs.length,
  };
}

export interface TxRow extends PlainTx {
  realized: number | null;
}

export async function getTransactions(userId: string): Promise<TxRow[]> {
  const rows = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { datetime: "asc" },
  });
  const txs = (rows as unknown as DbTx[]).map(decryptTx);
  const { realizedByTx } = computeCostBasis(txs);
  return txs.map((t) => ({ ...t, realized: realizedByTx.get(t.id) ?? null }));
}
