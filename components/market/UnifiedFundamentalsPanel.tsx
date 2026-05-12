"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type {
  DataSource,
  MergedRecommendation,
  UnifiedFundamentals,
  UnifiedMetric,
} from "@/lib/market/unified";
import { describeSource, newsSearchUrl } from "@/lib/market/unified";
import InfoTooltip from "@/components/ui/InfoTooltip";
import Modal from "@/components/ui/Modal";
import { GLOSSARY } from "@/lib/glossary";

type Tab =
  | "income"
  | "balance"
  | "cashflow"
  | "multiples"
  | "ratings"
  | "earnings";

const TABS: { id: Tab; label: string }[] = [
  { id: "income", label: "Resultado" },
  { id: "balance", label: "Balanço" },
  { id: "cashflow", label: "Caixa" },
  { id: "multiples", label: "Múltiplos" },
  { id: "ratings", label: "Recomendações" },
  { id: "earnings", label: "Earnings" },
];

const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 2,
});

function fmtMoneyCompact(v: number | undefined, currency: string): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtMoney(v: number | undefined, currency: string): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtNumber(v: number | undefined, digits = 2): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function fmtPct(v: number | undefined, alreadyPercent = false): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  const value = alreadyPercent ? v : v * 100;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function yearOf(d: string): string {
  return d ? d.slice(0, 4) : "—";
}

// Tooltip enriquecido: descrição do glossário + linha de proveniência.
function tooltipFor(glossary: string, m?: UnifiedMetric): ReactNode {
  if (!m) return glossary;
  const sourceLine = describeSource(m.source);
  const formulaLine =
    m.source === "calculated" && m.formula
      ? `Fórmula: ${m.formula}.`
      : null;
  return (
    <span className="block">
      <span className="block">{glossary}</span>
      <span className="mt-1.5 block text-[10.5px] font-medium text-ink-muted">
        {sourceLine}
        {formulaLine && (
          <>
            <br />
            {formulaLine}
          </>
        )}
      </span>
    </span>
  );
}

export default function UnifiedFundamentalsPanel({
  data,
}: {
  data: UnifiedFundamentals;
}) {
  const [tab, setTab] = useState<Tab>("income");
  const currency = data.currency;
  const ccyForMargin = currency;

  const has52w =
    data.fiftyTwoWeekLow !== undefined && data.fiftyTwoWeekHigh !== undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* Header stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Valor de mercado"
          metric={data.marketCap}
          format={(v) => fmtMoneyCompact(v, currency)}
          glossary={GLOSSARY.marketCap}
        />
        <Stat
          label="P/L (12m)"
          metric={data.trailingPE}
          format={fmtNumber}
          glossary={GLOSSARY.trailingPE}
        />
        <Stat
          label="P/L projetado"
          metric={data.forwardPE}
          format={fmtNumber}
          glossary={GLOSSARY.forwardPE}
        />
        <Stat
          label="P/VP"
          metric={data.priceToBook}
          format={fmtNumber}
          glossary={GLOSSARY.priceToBook}
        />
        <Stat
          label="LPA (12m)"
          metric={data.trailingEps}
          format={(v) => fmtMoney(v, currency)}
          glossary={GLOSSARY.trailingEps}
        />
        <Stat
          label="Dividend yield"
          metric={data.dividendYield}
          format={(v) => fmtPct(v)}
          glossary={GLOSSARY.dividendYield}
        />
        <Stat
          label="Beta"
          metric={data.beta}
          format={fmtNumber}
          glossary={GLOSSARY.beta}
        />
        <Stat
          label="Variação 12m"
          metric={data.fiftyTwoWeekChangePercent}
          format={(v) => fmtPct(v)}
          glossary={GLOSSARY.fiftyTwoWeekChangePercent}
        />
      </div>

      {/* Detail row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {has52w && (
          <Block label="Faixa 52 semanas" glossary={GLOSSARY.fiftyTwoWeekRange}>
            {fmtMoney(data.fiftyTwoWeekLow?.value, currency)} —{" "}
            {fmtMoney(data.fiftyTwoWeekHigh?.value, currency)}
          </Block>
        )}
        <Block
          label="Volume médio"
          glossary={GLOSSARY.averageVolume}
          metric={data.averageVolume}
        >
          {data.averageVolume
            ? compactNumber.format(data.averageVolume.value)
            : "—"}
        </Block>
        <Block
          label="Margem bruta"
          glossary={GLOSSARY.grossMargin}
          metric={data.grossMargin}
        >
          {fmtPct(data.grossMargin?.value)}
        </Block>
        <Block
          label="Margem operacional"
          glossary={GLOSSARY.operatingMargin}
          metric={data.operatingMargin}
        >
          {fmtPct(data.operatingMargin?.value)}
        </Block>
        <Block
          label="Margem líquida"
          glossary={GLOSSARY.profitMargins}
          metric={data.netMargin}
        >
          {fmtPct(data.netMargin?.value)}
        </Block>
        <Block
          label="Payout"
          glossary={GLOSSARY.payoutRatio}
          metric={data.payoutRatio}
        >
          {fmtPct(data.payoutRatio?.value)}
        </Block>
        <Block
          label="ROE"
          glossary={GLOSSARY.returnOnEquity}
          metric={data.returnOnEquity}
        >
          {fmtPct(data.returnOnEquity?.value)}
        </Block>
        <Block
          label="ROA"
          glossary={GLOSSARY.roa}
          metric={data.returnOnAssets}
        >
          {fmtPct(data.returnOnAssets?.value)}
        </Block>
        <Block
          label="Dívida / Patrimônio"
          glossary={GLOSSARY.debtToEquity}
          metric={data.debtToEquity}
        >
          {fmtNumber(data.debtToEquity?.value)}
        </Block>
        <Block
          label="Liquidez corrente"
          glossary={GLOSSARY.currentRatio}
          metric={data.currentRatio}
        >
          {fmtNumber(data.currentRatio?.value)}
        </Block>
        <Block
          label="Crescimento receita (YoY)"
          glossary={GLOSSARY.revenueGrowthYoy}
          metric={data.revenueGrowthYoy}
        >
          {fmtPct(data.revenueGrowthYoy?.value)}
        </Block>
        <Block
          label="vs S&P 500 (26s)"
          glossary={GLOSSARY.relativeToSP500}
          metric={data.relativeToSP500_26w}
        >
          {fmtPct(data.relativeToSP500_26w?.value)}
        </Block>
      </div>

      {/* Sector / industry / website */}
      {(data.sector || data.industry || data.country || data.website) && (
        <div className="text-xs text-ink-faint">
          {data.sector && (
            <span>
              Setor: <span className="text-ink-muted">{data.sector.value}</span>
            </span>
          )}
          {data.industry && data.industry.value !== data.sector?.value && (
            <>
              <span className="mx-2">·</span>
              <span>
                Indústria:{" "}
                <span className="text-ink-muted">{data.industry.value}</span>
              </span>
            </>
          )}
          {data.country && (
            <>
              <span className="mx-2">·</span>
              <span>{data.country.value}</span>
            </>
          )}
          {data.website && (
            <>
              <span className="mx-2">·</span>
              <a
                href={data.website.value}
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

      {/* Price target slider */}
      {data.priceTarget && data.priceTarget.targetMean > 0 && (
        <PriceTargetBar
          target={data.priceTarget}
          currency={currency}
        />
      )}

      {/* About */}
      {data.longBusinessSummary && (
        <details className="rounded-xl border border-surface-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Sobre a empresa
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
            {data.longBusinessSummary}
          </p>
        </details>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        className="flex flex-wrap gap-1.5 rounded-xl bg-surface-muted p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition ${
              tab === t.id
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "income" && (
        <StatementTab
          empty="Yahoo não publicou demonstrativo de resultados para este ativo."
          rows={data.income as unknown as StatementRowAny[]}
          currency={ccyForMargin}
          lines={[
            { label: "Receita", glossary: GLOSSARY.totalRevenue, key: "totalRevenue" },
            { label: "Lucro bruto", glossary: GLOSSARY.grossProfit, key: "grossProfit" },
            { label: "Lucro operacional", glossary: GLOSSARY.operatingIncome, key: "operatingIncome" },
            { label: "EBITDA", glossary: GLOSSARY.ebitda, key: "ebitda" },
            { label: "Lucro líquido", glossary: GLOSSARY.netIncome, key: "netIncome" },
          ]}
        />
      )}

      {tab === "balance" && (
        <StatementTab
          empty="Balanço patrimonial não disponível para este ativo."
          rows={data.balance as unknown as StatementRowAny[]}
          currency={ccyForMargin}
          lines={[
            { label: "Ativo total", glossary: GLOSSARY.totalAssets, key: "totalAssets" },
            { label: "Passivo total", glossary: GLOSSARY.totalLiabilities, key: "totalLiabilities" },
            { label: "Patrimônio líquido", glossary: GLOSSARY.totalEquity, key: "totalEquity" },
            { label: "Caixa e equiv.", glossary: GLOSSARY.totalCash, key: "totalCash" },
            { label: "Dívida total", glossary: GLOSSARY.totalDebt, key: "totalDebt" },
          ]}
        />
      )}

      {tab === "cashflow" && (
        <StatementTab
          empty="Fluxo de caixa não disponível para este ativo."
          rows={data.cashflow as unknown as StatementRowAny[]}
          currency={ccyForMargin}
          lines={[
            { label: "Caixa operacional", glossary: GLOSSARY.operatingCashflow, key: "operatingCashflow" },
            { label: "CAPEX", glossary: GLOSSARY.capitalExpenditures, key: "capitalExpenditures" },
            { label: "Fluxo de caixa livre", glossary: GLOSSARY.freeCashflow, key: "freeCashflow" },
            { label: "Dividendos pagos", glossary: GLOSSARY.dividendsPaid, key: "dividendsPaid" },
          ]}
        />
      )}

      {tab === "multiples" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MultipleCard
            label="EV / EBITDA"
            metric={data.evEbitda}
            glossary={GLOSSARY.evEbitda}
            format={fmtNumber}
          />
          <MultipleCard
            label="Dívida líquida / EBITDA"
            metric={data.netDebtToEbitda}
            glossary={GLOSSARY.netDebtToEbitda}
            format={fmtNumber}
          />
          <MultipleCard
            label="PEG"
            metric={data.pegRatio}
            glossary={GLOSSARY.pegRatio}
            format={fmtNumber}
          />
          <MultipleCard
            label="Margem bruta"
            metric={data.grossMargin}
            glossary={GLOSSARY.grossMargin}
            format={(v) => fmtPct(v)}
          />
          <MultipleCard
            label="Margem operacional"
            metric={data.operatingMargin}
            glossary={GLOSSARY.operatingMargin}
            format={(v) => fmtPct(v)}
          />
          <MultipleCard
            label="Payout"
            metric={data.payoutRatio}
            glossary={GLOSSARY.payoutRatio}
            format={(v) => fmtPct(v)}
          />
        </div>
      )}

      {tab === "ratings" && (
        <RecommendationsView
          recommendations={data.recommendations}
          upgrades={data.upgrades}
          displayTicker={data.displayTicker}
        />
      )}

      {tab === "earnings" && (
        <EarningsTab earnings={data.earnings} currency={currency} />
      )}
    </div>
  );
}

// --- Subcomponentes ----------------------------------------------------

function Stat({
  label,
  metric,
  format,
  glossary,
}: {
  label: string;
  metric?: UnifiedMetric;
  format: (v: number) => string;
  glossary: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        {label}
        <InfoTooltip content={tooltipFor(glossary, metric)} />
        {metric && <SourceBadge source={metric.source} />}
      </div>
      <div className="tabular mt-1 text-[15px] font-bold text-ink">
        {metric ? format(metric.value) : "—"}
      </div>
    </div>
  );
}

function Block({
  label,
  glossary,
  metric,
  children,
}: {
  label: string;
  glossary: string;
  metric?: UnifiedMetric;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        {label}
        <InfoTooltip content={tooltipFor(glossary, metric)} />
        {metric && <SourceBadge source={metric.source} />}
      </div>
      <div className="tabular mt-1 text-sm text-ink">{children}</div>
    </div>
  );
}

function MultipleCard({
  label,
  metric,
  glossary,
  format,
}: {
  label: string;
  metric?: UnifiedMetric;
  glossary: string;
  format: (v: number) => string;
}) {
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        {label}
        <InfoTooltip content={tooltipFor(glossary, metric)} />
        {metric && <SourceBadge source={metric.source} />}
      </div>
      <div className="tabular mt-1 text-[15px] font-bold text-ink">
        {metric ? format(metric.value) : "—"}
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: DataSource }) {
  const label =
    source === "yahoo"
      ? "Y"
      : source === "finnhub"
        ? "F"
        : source === "calculated"
          ? "f(x)"
          : "?";
  const title =
    source === "yahoo"
      ? "Yahoo Finance"
      : source === "finnhub"
        ? "Finnhub"
        : "Calculado a partir dos demonstrativos";
  return (
    <span
      title={title}
      aria-hidden
      className="ml-auto rounded border border-surface-border bg-surface px-1 text-[8px] font-bold uppercase tracking-[0.06em] text-ink-faint"
    >
      {label}
    </span>
  );
}

interface StatementLine {
  label: string;
  glossary: string;
  key: string;
}

// Tipo achatado para os 3 demonstrativos. As tabelas só leem por `key`
// (e.g. "totalRevenue", "totalAssets"), então tratamos todos como
// Record<string, number | undefined> + endDate.
type StatementRowAny = { endDate: string } & Record<string, number | undefined>;

type StatementRow = StatementRowAny;

function StatementTab({
  rows,
  lines,
  currency,
  empty,
}: {
  rows: Array<{ endDate: string } & Record<string, number | undefined>>;
  lines: StatementLine[];
  currency: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-surface-border-light bg-surface-muted px-3.5 py-3 text-[13px] text-ink-muted">
        {empty}
      </p>
    );
  }
  const years = rows.slice(0, 4) as StatementRow[];

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border-light">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-surface-border-light bg-surface-muted">
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
              Indicador
            </th>
            {years.map((y) => (
              <th
                key={y.endDate}
                className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint"
              >
                {yearOf(y.endDate)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr
              key={line.key}
              className="border-b border-surface-border-light last:border-0"
            >
              <td className="px-3 py-2.5 text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  {line.label}
                  <InfoTooltip content={line.glossary} />
                </span>
              </td>
              {years.map((y) => (
                <td
                  key={`${line.key}-${y.endDate}`}
                  className="tabular px-3 py-2.5 text-right font-semibold text-ink"
                >
                  {fmtMoneyCompact(y[line.key], currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[10px] text-ink-faint">
        Demonstrativos via Yahoo Finance · 4 últimos exercícios anuais.
      </p>
    </div>
  );
}

function PriceTargetBar({
  target,
  currency,
}: {
  target: { targetLow: number; targetHigh: number; targetMean: number; targetMedian: number; lastUpdated: string };
  currency: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
          Preço-alvo dos analistas
          <InfoTooltip
            content={tooltipFor(GLOSSARY.priceTarget, {
              value: target.targetMean,
              source: "finnhub",
            })}
          />
          <SourceBadge source="finnhub" />
        </span>
        <span className="text-[10px] text-ink-faint">
          atualizado em {target.lastUpdated}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
        <Cell label="Mínimo" value={fmtMoney(target.targetLow, currency)} />
        <Cell label="Médio" value={fmtMoney(target.targetMean, currency)} />
        <Cell label="Máximo" value={fmtMoney(target.targetHigh, currency)} />
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border-light bg-surface px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        {label}
      </div>
      <div className="tabular mt-0.5 text-sm font-bold text-ink">{value}</div>
    </div>
  );
}

function RecommendationsView({
  recommendations,
  upgrades,
  displayTicker,
}: {
  recommendations: MergedRecommendation | null;
  upgrades: { date: string; firm: string; fromGrade?: string; toGrade?: string; action?: string }[];
  displayTicker: string;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  if (!recommendations && upgrades.length === 0) {
    return (
      <p className="rounded-xl border border-surface-border-light bg-surface-muted px-3.5 py-3 text-[13px] text-ink-muted">
        Nenhuma recomendação de analista disponível para este ativo.
      </p>
    );
  }

  const sourceLabel =
    recommendations?.source === "merged"
      ? "Yahoo Finance + Finnhub"
      : recommendations?.source === "yahoo"
        ? "Yahoo Finance"
        : recommendations?.source === "finnhub"
          ? "Finnhub"
          : "—";

  return (
    <div className="flex flex-col gap-4">
      {recommendations && recommendations.total > 0 && (
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="group rounded-xl border border-surface-border-light bg-surface-muted p-4 text-left transition hover:border-brand-border hover:bg-brand-pastel/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
          aria-label="Ver explicação detalhada sobre as recomendações"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
              Consenso de analistas
            </span>
            <span className="flex items-center gap-2 text-[11px] text-ink-faint">
              {recommendations.total} analistas · {sourceLabel}
              <span className="inline-flex h-5 items-center gap-1 rounded-full border border-surface-border bg-surface px-2 text-[10px] font-semibold text-brand transition group-hover:border-brand-border">
                <span>?</span>
                <span className="hidden sm:inline">Como ler</span>
              </span>
            </span>
          </div>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-surface">
            <Segment value={recommendations.strongBuy} total={recommendations.total} tone="bg-positive" />
            <Segment value={recommendations.buy} total={recommendations.total} tone="bg-positive/70" />
            <Segment value={recommendations.hold} total={recommendations.total} tone="bg-ink-faint/40" />
            <Segment value={recommendations.sell} total={recommendations.total} tone="bg-negative/70" />
            <Segment value={recommendations.strongSell} total={recommendations.total} tone="bg-negative" />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2 text-[10px] text-ink-muted">
            <Legend label="Strong Buy" value={recommendations.strongBuy} />
            <Legend label="Buy" value={recommendations.buy} />
            <Legend label="Hold" value={recommendations.hold} />
            <Legend label="Sell" value={recommendations.sell} />
            <Legend label="Strong Sell" value={recommendations.strongSell} />
          </div>
          <p className="mt-3 text-[11px] text-brand">
            Clique para entender como essas recomendações são formadas →
          </p>
        </button>
      )}

      {upgrades.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
            Atualizações recentes das casas de análise
          </div>
          <div className="overflow-x-auto rounded-xl border border-surface-border-light">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-surface-border-light bg-surface-muted">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                    Data
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                    Casa
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                    Movimento
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                    Notícias
                  </th>
                </tr>
              </thead>
              <tbody>
                {upgrades.slice(0, 10).map((u) => (
                  <tr
                    key={`${u.date}-${u.firm}`}
                    className="border-b border-surface-border-light last:border-0"
                  >
                    <td className="px-3 py-2 text-ink-muted">{u.date || "—"}</td>
                    <td className="px-3 py-2 font-semibold text-ink">{u.firm}</td>
                    <td className="px-3 py-2 text-ink-muted">
                      {u.fromGrade ? `${u.fromGrade} → ` : ""}
                      <span className="font-semibold text-ink">
                        {u.toGrade ?? u.action ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={newsSearchUrl(u.firm, displayTicker)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-brand hover:underline"
                      >
                        ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[10px] text-ink-faint">
              Atualizações via Yahoo Finance. O link &quot;ver&quot; abre
              uma busca no Google News pela casa + ticker para contexto
              jornalístico.
            </p>
          </div>
        </div>
      )}

      <RatingsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

function Segment({
  value,
  total,
  tone,
}: {
  value: number;
  total: number;
  tone: string;
}) {
  const w = total > 0 ? (value / total) * 100 : 0;
  if (w === 0) return null;
  return <div className={tone} style={{ width: `${w}%` }} />;
}

function Legend({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="tabular font-semibold text-ink">{value}</div>
      <div>{label}</div>
    </div>
  );
}

function EarningsTab({
  earnings,
  currency,
}: {
  earnings: { period: string; year: number; quarter: number; estimate: number; actual: number; surprise: number; surprisePercent: number }[];
  currency: string;
}) {
  if (earnings.length === 0) {
    return (
      <p className="rounded-xl border border-surface-border-light bg-surface-muted px-3.5 py-3 text-[13px] text-ink-muted">
        Sem surpresas de earnings publicadas para este ativo.
      </p>
    );
  }
  const last = earnings.slice(0, 4);
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        Surpresas de earnings (últimos trimestres)
        <InfoTooltip
          content={tooltipFor(GLOSSARY.earningsSurprise, {
            value: 0,
            source: "finnhub",
          })}
        />
        <SourceBadge source="finnhub" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-surface-border-light">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-surface-border-light bg-surface-muted">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                Período
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                Estimativa
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                Real
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                Surpresa
              </th>
            </tr>
          </thead>
          <tbody>
            {last.map((e) => (
              <tr
                key={`${e.year}-${e.quarter}`}
                className="border-b border-surface-border-light last:border-0"
              >
                <td className="px-3 py-2 text-ink-muted">
                  {e.year}Q{e.quarter}
                </td>
                <td className="tabular px-3 py-2 text-right text-ink-muted">
                  {fmtMoney(e.estimate, currency)}
                </td>
                <td className="tabular px-3 py-2 text-right font-semibold text-ink">
                  {fmtMoney(e.actual, currency)}
                </td>
                <td
                  className={`tabular px-3 py-2 text-right font-semibold ${
                    e.surprise >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {e.surprise >= 0 ? "+" : ""}
                  {fmtMoney(e.surprise, currency)}
                  <span className="ml-1 text-[10px]">
                    ({fmtPct(e.surprisePercent, true)})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Modal didático (reaproveitado da Sprint B) ------------------------

function RatingsHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Como ler as recomendações de analistas"
      subtitle="O que cada classificação significa, quem produz e como interpretar"
    >
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-1.5 text-sm font-bold text-ink">
            O que são essas recomendações?
          </h3>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Bancos de investimento, corretoras e casas de análise (Goldman
            Sachs, JP Morgan, XP, BTG Pactual, etc.) empregam analistas que
            estudam empresas em profundidade. Cada casa publica uma
            classificação. O agregado dessas opiniões é o que você vê na
            barra colorida.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-ink">
            As 5 classificações padrão
          </h3>
          <ul className="flex flex-col gap-2.5">
            <Rating tone="bg-positive" label="Strong Buy" description="Convicção alta de que o preço vai subir bem acima da média do mercado nos próximos 6–12 meses." />
            <Rating tone="bg-positive/70" label="Buy" description="Expectativa de retorno acima do mercado, mas com menos convicção que Strong Buy." />
            <Rating tone="bg-ink-faint/40" label="Hold" description="Espera-se que o ativo acompanhe o mercado. Não é venda — é 'fique no que tem'." />
            <Rating tone="bg-negative/70" label="Sell" description="Expectativa de retorno abaixo do mercado." />
            <Rating tone="bg-negative" label="Strong Sell" description="Convicção alta de queda significativa ou deterioração fundamental." />
          </ul>
        </section>

        <section>
          <h3 className="mb-1.5 text-sm font-bold text-ink">
            Como interpretar o consenso
          </h3>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Barra majoritariamente verde indica consenso otimista. Mais Hold
            do que Buy/Sell costuma significar que o mercado já precificou
            as boas notícias mais óbvias. Polarização (muitos Buy + muitos
            Sell) sugere tese controversa.
          </p>
        </section>

        <section>
          <h3 className="mb-1.5 text-sm font-bold text-ink">
            Por que NÃO seguir cegamente?
          </h3>
          <ul className="ml-4 list-disc text-[13px] leading-relaxed text-ink-muted">
            <li>Analistas têm conflitos de interesse (banco de investimento da empresa coberta).</li>
            <li>Horizonte tipicamente 6–12 meses — pouca relevância para longo prazo.</li>
            <li>Recomendações demoram a mudar após eventos relevantes.</li>
            <li>O consenso é média ponderada — pode esconder uma minoria muito convicta e correta.</li>
          </ul>
        </section>

        <div className="rounded-xl border border-brand-border bg-brand-pastel px-3.5 py-3 text-[12px] leading-relaxed text-brand">
          <strong className="font-bold">Importante:</strong> esta seção é
          informativa e educacional. Recomendações de analistas{" "}
          <strong className="font-bold">não são</strong> garantia de
          retorno futuro nem substituem análise própria.
        </div>
      </div>
    </Modal>
  );
}

function Rating({
  tone,
  label,
  description,
}: {
  tone: string;
  label: string;
  description: string;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-surface-border-light bg-surface-muted p-3">
      <span
        aria-hidden
        className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${tone}`}
      />
      <div className="flex-1">
        <div className="text-[13px] font-bold text-ink">{label}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">
          {description}
        </div>
      </div>
    </li>
  );
}
