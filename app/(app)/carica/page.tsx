import UploadForm from "@/components/UploadForm";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Carica dati · Portfolio" };

export default function CaricaPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Carica dati"
        subtitle="Estratti PDF e CSV transazioni di Trade Republic. Il parsing avviene sul server; i dati salvati sono cifrati."
      />
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
