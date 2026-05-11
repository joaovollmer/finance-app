import Link from "next/link";
import type { PeerQuote } from "@/lib/market/types";

const compact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 2,
});

function fmtMoney(v: number | undefined, currency: string): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtPrice(v: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtPct(v: number | undefined, alreadyPercent = false): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  const value = alreadyPercent ? v : v * 100;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function fmtNumber(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export default function PeersPanel({ peers }: { peers: PeerQuote[] }) {
  if (peers.length === 0) {
    return (
      <p className="rounded-xl border border-surface-border-light bg-surface-muted px-3.5 py-3 text-[13px] text-ink-muted">
        Sem comparação setorial disponível para este ativo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-surface-border">
            {["Ticker", "Cotação", "Variação", "Mkt cap", "P/L", "12 meses"].map(
              (h, i) => (
                <th
                  key={h}
                  className={`px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint ${i === 0 ? "text-left" : "text-right"}`}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {peers.map((p) => (
            <tr
              key={p.ticker}
              className="border-b border-surface-border-light transition hover:bg-surface-muted"
            >
              <td className="px-2.5 py-2.5">
                <Link
                  href={`/ativo/${encodeURIComponent(p.displayTicker)}`}
                  className="flex items-center gap-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-pastel text-[10px] font-extrabold text-brand">
                    {p.displayTicker.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-ink hover:text-brand">
                      {p.displayTicker}
                    </div>
                    <div className="line-clamp-1 text-[11px] text-ink-faint">
                      {p.name}
                    </div>
                  </div>
                </Link>
              </td>
              <td className="tabular px-2.5 py-2.5 text-right font-semibold text-ink">
                {fmtPrice(p.price, p.currency)}
              </td>
              <td
                className={`tabular px-2.5 py-2.5 text-right font-semibold ${p.changePercent >= 0 ? "text-positive" : "text-negative"}`}
              >
                {fmtPct(p.changePercent, true)}
              </td>
              <td className="tabular px-2.5 py-2.5 text-right text-ink-muted">
                {fmtMoney(p.marketCap, p.currency)}
              </td>
              <td className="tabular px-2.5 py-2.5 text-right text-ink-muted">
                {fmtNumber(p.trailingPE)}
              </td>
              <td
                className={`tabular px-2.5 py-2.5 text-right ${(p.fiftyTwoWeekChangePercent ?? 0) >= 0 ? "text-positive" : "text-negative"}`}
              >
                {fmtPct(p.fiftyTwoWeekChangePercent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-ink-faint">
        Lista curada por setor — não é recomendação. Use para comparar
        múltiplos e performance entre concorrentes diretos. Dados
        atualizados pelo Yahoo.
      </p>
    </div>
  );
}

export { compact };
