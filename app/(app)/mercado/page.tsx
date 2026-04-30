import AssetSearch from "@/components/market/AssetSearch";

export default function MercadoPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Mercado</h1>
      <p className="mt-1 text-slate-600">
        Busque um ativo para ver cotação, histórico e operar.
      </p>

      <div className="mt-6">
        <AssetSearch />
      </div>

      <div className="mt-10 rounded-2xl border border-surface-border bg-white p-5 text-sm text-slate-600">
        <strong className="block text-slate-900">Dica</strong>
        Use o código do ticker. Para ações brasileiras, digite{" "}
        <code className="rounded bg-surface-muted px-1">PETR4</code>,{" "}
        <code className="rounded bg-surface-muted px-1">VALE3</code>. Para
        americanas, <code className="rounded bg-surface-muted px-1">AAPL</code>,{" "}
        <code className="rounded bg-surface-muted px-1">MSFT</code>.
      </div>
    </div>
  );
}
