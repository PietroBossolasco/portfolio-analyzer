import Link from "next/link";
import { getTransactions } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import TransactionsTable, { type TxView } from "@/components/TransactionsTable";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function TransazioniPage() {
  const user = await requireUser();
  const txs = await getTransactions(user.id);

  if (!txs.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center text-slate-500">
        <div className="text-4xl">🧾</div>
        <p className="mt-3 text-sm">Nessuna transazione. Carica il CSV per popolarle.</p>
        <Link href="/carica" className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
          Carica dati
        </Link>
      </div>
    );
  }

  const rows: TxView[] = txs.map((t) => ({
    date: t.date.toISOString().slice(0, 10),
    tipo: t.tipo,
    isin: t.isin,
    nome: t.nome,
    shares: t.shares,
    price: t.price,
    amount: t.amount,
    fee: t.fee,
    tax: t.tax,
    realized: t.realized,
    description: t.description,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Registro Transazioni"
        subtitle="Movimenti normalizzati dal CSV, con plus/minus realizzata a costo medio."
      />
      <TransactionsTable rows={rows} />
    </div>
  );
}
