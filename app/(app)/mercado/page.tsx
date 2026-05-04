import AssetSearch from "@/components/market/AssetSearch";

export default function MercadoPage() {
  return (
    <div>
      <div className="mb-7">
        <h1
          className="text-[22px] font-extrabold text-ink"
          style={{ letterSpacing: "-0.03em" }}
        >
          Mercado
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Busque ativos, analise fundamentos e execute ordens
        </p>
      </div>

      <AssetSearch />

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-border bg-brand-pastel p-4 text-[13px] text-brand">
        <span className="text-lg leading-none" aria-hidden>
          ◈
        </span>
        <span>
          <strong className="font-bold">Dica:</strong> Use o código do ticker
          para buscar. Ações BR:{" "}
          <code className="rounded bg-surface px-1.5 py-0.5">PETR4</code>,{" "}
          <code className="rounded bg-surface px-1.5 py-0.5">VALE3</code>.
          Ações EUA:{" "}
          <code className="rounded bg-surface px-1.5 py-0.5">AAPL</code>,{" "}
          <code className="rounded bg-surface px-1.5 py-0.5">NVDA</code>.
        </span>
      </div>
    </div>
  );
}
