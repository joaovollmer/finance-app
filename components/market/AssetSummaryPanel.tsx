import type { AssetSummary } from "@/lib/market/types";

const compactBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 2,
});
const compactUSD = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});
const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 2,
});

function fmtMoney(v: number | undefined, currency: string): string {
  if (v === undefined) return "—";
  const fmt = currency === "USD" ? compactUSD : compactBRL;
  return fmt.format(v);
}

function fmtPct(v: number | undefined, alreadyPercent = false): string {
  if (v === undefined) return "—";
  const value = alreadyPercent ? v : v * 100;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function fmtNumber(v: number | undefined, digits = 2): string {
  if (v === undefined) return "—";
  return v.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export default function AssetSummaryPanel({
  summary,
}: {
  summary: AssetSummary;
}) {
  const ccy = summary.currency;
  const has52wRange =
    summary.fiftyTwoWeekLow !== undefined &&
    summary.fiftyTwoWeekHigh !== undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Valor de mercado"
          value={fmtMoney(summary.marketCap, ccy)}
          hint="Market cap"
        />
        <Stat
          label="P/L (12m)"
          value={fmtNumber(summary.trailingPE)}
          hint="Preço sobre lucro dos últimos 12 meses"
        />
        <Stat
          label="P/L projetado"
          value={fmtNumber(summary.forwardPE)}
          hint="Forward P/E"
        />
        <Stat
          label="P/VP"
          value={fmtNumber(summary.priceToBook)}
          hint="Preço sobre valor patrimonial"
        />
        <Stat
          label="LPA (12m)"
          value={fmtNumber(summary.trailingEps)}
          hint="Lucro por ação dos últimos 12 meses"
        />
        <Stat
          label="Dividend yield"
          value={fmtPct(summary.dividendYield)}
        />
        <Stat
          label="Beta"
          value={fmtNumber(summary.beta)}
          hint="Volatilidade vs. mercado"
        />
        <Stat
          label="Variação 12m"
          value={fmtPct(summary.fiftyTwoWeekChangePercent)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {has52wRange && (
          <div className="rounded-xl border border-surface-border bg-surface-muted p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Faixa 52 semanas
            </div>
            <div className="mt-1 text-sm text-slate-700">
              {fmtMoney(summary.fiftyTwoWeekLow, ccy)} —{" "}
              {fmtMoney(summary.fiftyTwoWeekHigh, ccy)}
            </div>
          </div>
        )}
        <div className="rounded-xl border border-surface-border bg-surface-muted p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Volume médio
          </div>
          <div className="mt-1 text-sm text-slate-700">
            {summary.averageVolume !== undefined
              ? compactNumber.format(summary.averageVolume)
              : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-muted p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Margem líquida
          </div>
          <div className="mt-1 text-sm text-slate-700">
            {fmtPct(summary.profitMargins)}
          </div>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-muted p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Retorno sobre patrimônio
          </div>
          <div className="mt-1 text-sm text-slate-700">
            {fmtPct(summary.returnOnEquity)}
          </div>
        </div>
      </div>

      {(summary.sector || summary.industry || summary.country) && (
        <div className="text-xs text-slate-500">
          {summary.sector && <span>Setor: {summary.sector}</span>}
          {summary.industry && (
            <>
              <span className="mx-2">·</span>
              <span>Indústria: {summary.industry}</span>
            </>
          )}
          {summary.country && (
            <>
              <span className="mx-2">·</span>
              <span>{summary.country}</span>
            </>
          )}
          {summary.website && (
            <>
              <span className="mx-2">·</span>
              <a
                href={summary.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                site oficial
              </a>
            </>
          )}
        </div>
      )}

      {summary.longBusinessSummary && (
        <details className="rounded-xl border border-surface-border bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Sobre a empresa
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {summary.longBusinessSummary}
          </p>
        </details>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
