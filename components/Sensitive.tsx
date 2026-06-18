// Avvolge un valore sensibile (importo in €). Quando la modalità privacy è attiva
// (html[data-privacy="on"]) il contenuto viene sfocato via CSS; al passaggio del
// mouse si rivela. Componente "server-safe": è solo uno <span>.
export function Sensitive({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`priv ${className}`}>{children}</span>;
}
