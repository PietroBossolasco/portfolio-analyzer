import UploadForm from "@/components/UploadForm";

export const metadata = { title: "Carica dati · Portfolio" };

export default function CaricaPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Carica dati</h1>
        <p className="text-sm text-slate-500">
          Carica gli estratti PDF “Estratto del patrimonio netto” e il CSV “Transaction export”
          di Trade Republic. Il parsing avviene sul server e i dati vengono salvati in Postgres.
        </p>
      </header>
      <UploadForm />
      <div className="card text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-800">Come funziona</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Ogni PDF crea/aggiorna uno snapshot mensile con le posizioni (per data di riferimento).</li>
          <li>Il CSV popola il registro transazioni; le righe sono idempotenti (per ID operazione).</li>
          <li>Prezzo di carico, plus/minus e statistiche sono ricalcolati automaticamente.</li>
          <li>Puoi caricare più PDF mensili nel tempo: l’andamento storico si arricchisce da solo.</li>
        </ul>
      </div>
    </div>
  );
}
