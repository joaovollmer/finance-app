import type { AssetSummary } from "@/lib/market/types";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { GLOSSARY } from "@/lib/glossary";

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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Valor de mercado"
          value={fmtMoney(summary.marketCap, ccy)}
          tooltip={GLOSSARY.marketCap}
        />
        <Stat
          label="P/L (12m)"
          value={fmtNumber(summary.trailingPE)}
          tooltip={GLOSSARY.trailingPE}
        />
        <Stat
          label="P/L projetado"
          value={fmtNumber(summary.forwardPE)}
          tooltip={GLOSSARY.forwardPE}
        />
        <Stat
          label="P/VP"
          value={fmtNumber(summary.priceToBook)}
          tooltip={GLOSSARY.priceToBook}
        />
        <Stat
          label="LPA (12m)"
          value={fmtNumber(summary.trailingEps)}
          tooltip={GLOSSARY.trailingEps}
        />
        <Stat
          label="Dividend yield"
          value={fmtPct(summary.dividendYield)}
          tooltip={GLOSSARY.dividendYield}
        />
        <Stat
          label="Beta"
          value={fmtNumber(summary.beta)}
          tooltip={GLOSSARY.beta}
        />
        <Stat
          label="Variação 12m"
          value={fmtPct(summary.fiftyTwoWeekChangePercent)}
          tooltip={GLOSSARY.fiftyTwoWeekChangePercent}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {has52wRange && (
          <Block label="Faixa 52 semanas" tooltip={GLOSSARY.fiftyTwoWeekRange}>
            {fmtMoney(summary.fiftyTwoWeekLow, ccy)} —{" "}
            {fmtMoney(summary.fiftyTwoWeekHigh, ccy)}
          </Block>
        )}
        <Block label="Volume médio" tooltip={GLOSSARY.averageVolume}>
          {summary.averageVolume !== undefined
            ? compactNumber.format(summary.averageVolume)
            : "—"}
        </Block>
        <Block label="Margem líquida" tooltip={GLOSSARY.profitMargins}>
          {fmtPct(summary.profitMargins)}
        </Block>
        <Block
          label="Retorno sobre patrimônio"
          tooltip={GLOSSARY.returnOnEquity}
        >
          {fmtPct(summary.returnOnEquity)}
        </Block>
      </div>

      {(summary.sector || summary.industry || summary.country) && (
        <div className="text-xs text-ink-faint">
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
                className="font-semibold text-brand hover:underline"
              >
                site oficial
              </a>
            </>
          )}
        </div>
      )}

      {summary.longBusinessSummary && (
        <details className="rounded-xl border border-surface-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Sobre a empresa
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
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
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        {label}
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <div className="tabular mt-1 text-[15px] font-bold text-ink">{value}</div>
    </div>
  );
}

function Block({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        {label}
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <div className="tabular mt-1 text-sm text-ink">{children}</div>
    </div>
  );
}
