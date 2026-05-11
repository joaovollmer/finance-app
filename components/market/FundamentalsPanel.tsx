"use client";

import { useState } from "react";
import type { AssetFundamentals } from "@/lib/market/types";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { GLOSSARY } from "@/lib/glossary";

type Tab = "income" | "balance" | "cashflow" | "multiples" | "ratings";

const TABS: { id: Tab; label: string }[] = [
  { id: "income", label: "Resultado" },
  { id: "balance", label: "Balanço" },
  { id: "cashflow", label: "Caixa" },
  { id: "multiples", label: "Múltiplos" },
  { id: "ratings", label: "Recomendações" },
];

const compactBRL = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 2,
});

function fmtMoney(v: number | undefined, currency: string): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return (
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(v) ?? compactBRL.format(v)
  );
}

function fmtNumber(v: number | undefined, digits = 2): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function fmtPct(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  const value = v * 100;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function yearOf(d: string): string {
  return d ? d.slice(0, 4) : "—";
}

export default function FundamentalsPanel({
  fundamentals,
  currency,
}: {
  fundamentals: AssetFundamentals;
  currency: string;
}) {
  const [tab, setTab] = useState<Tab>("income");

  const hasIncome = fundamentals.income.length > 0;
  const hasBalance = fundamentals.balance.length > 0;
  const hasCashflow = fundamentals.cashflow.length > 0;
  const hasRecs = fundamentals.recommendations.length > 0;

  return (
    <div className="flex flex-col gap-4">
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

      {tab === "income" &&
        (hasIncome ? (
          <StatementTable
            currency={currency}
            rows={fundamentals.income as unknown as StatementRow[]}
            lines={[
              { label: "Receita", tooltip: GLOSSARY.totalRevenue, key: "totalRevenue" },
              { label: "Lucro bruto", tooltip: GLOSSARY.grossProfit, key: "grossProfit" },
              { label: "Lucro operacional", tooltip: GLOSSARY.operatingIncome, key: "operatingIncome" },
              { label: "EBITDA", tooltip: GLOSSARY.ebitda, key: "ebitda" },
              { label: "Lucro líquido", tooltip: GLOSSARY.netIncome, key: "netIncome" },
            ]}
          />
        ) : (
          <Empty message="Yahoo não publicou demonstrativo de resultados para este ativo." />
        ))}

      {tab === "balance" &&
        (hasBalance ? (
          <StatementTable
            currency={currency}
            rows={fundamentals.balance as unknown as StatementRow[]}
            lines={[
              { label: "Ativo total", tooltip: GLOSSARY.totalAssets, key: "totalAssets" },
              { label: "Passivo total", tooltip: GLOSSARY.totalLiabilities, key: "totalLiabilities" },
              { label: "Patrimônio líquido", tooltip: GLOSSARY.totalEquity, key: "totalEquity" },
              { label: "Caixa e equiv.", tooltip: GLOSSARY.totalCash, key: "totalCash" },
              { label: "Dívida total", tooltip: GLOSSARY.totalDebt, key: "totalDebt" },
            ]}
          />
        ) : (
          <Empty message="Balanço patrimonial não disponível para este ativo." />
        ))}

      {tab === "cashflow" &&
        (hasCashflow ? (
          <StatementTable
            currency={currency}
            rows={fundamentals.cashflow as unknown as StatementRow[]}
            lines={[
              { label: "Caixa operacional", tooltip: GLOSSARY.operatingCashflow, key: "operatingCashflow" },
              { label: "CAPEX", tooltip: GLOSSARY.capitalExpenditures, key: "capitalExpenditures" },
              { label: "Fluxo de caixa livre", tooltip: GLOSSARY.freeCashflow, key: "freeCashflow" },
              { label: "Dividendos pagos", tooltip: GLOSSARY.dividendsPaid, key: "dividendsPaid" },
            ]}
          />
        ) : (
          <Empty message="Fluxo de caixa não disponível para este ativo." />
        ))}

      {tab === "multiples" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MultipleCard
            label="EV / EBITDA"
            tooltip={GLOSSARY.evEbitda}
            value={fmtNumber(fundamentals.derived.evEbitda)}
          />
          <MultipleCard
            label="Dívida líquida / EBITDA"
            tooltip={GLOSSARY.netDebtToEbitda}
            value={fmtNumber(fundamentals.derived.netDebtToEbitda)}
          />
          <MultipleCard
            label="Payout"
            tooltip={GLOSSARY.payoutRatio}
            value={fmtPct(fundamentals.derived.payoutRatio)}
          />
          <MultipleCard
            label="Margem bruta"
            tooltip={GLOSSARY.grossMargin}
            value={fmtPct(fundamentals.derived.grossMargin)}
          />
          <MultipleCard
            label="Margem operacional"
            tooltip={GLOSSARY.operatingMargin}
            value={fmtPct(fundamentals.derived.operatingMargin)}
          />
        </div>
      )}

      {tab === "ratings" &&
        (hasRecs ? (
          <RecommendationsView
            trend={fundamentals.recommendations}
            upgrades={fundamentals.upgrades}
          />
        ) : (
          <Empty message="Nenhuma recomendação de analista disponível para este ativo." />
        ))}
    </div>
  );
}

type StatementRow = { endDate: string } & Record<string, number | undefined>;

interface Line {
  label: string;
  tooltip?: string;
  key: string;
}

function StatementTable({
  rows,
  lines,
  currency,
}: {
  rows: StatementRow[];
  lines: Line[];
  currency: string;
}) {
  const years = rows.slice(0, 4);

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
                  {line.tooltip && <InfoTooltip content={line.tooltip} />}
                </span>
              </td>
              {years.map((y) => (
                <td
                  key={`${line.key}-${y.endDate}`}
                  className="tabular px-3 py-2.5 text-right font-semibold text-ink"
                >
                  {fmtMoney(y[line.key], currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MultipleCard({
  label,
  tooltip,
  value,
}: {
  label: string;
  tooltip?: string;
  value: string;
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

function RecommendationsView({
  trend,
  upgrades,
}: {
  trend: import("@/lib/market/types").RecommendationTrend[];
  upgrades: import("@/lib/market/types").UpgradeDowngrade[];
}) {
  const latest = trend[0];
  const total = latest
    ? latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {latest && total > 0 && (
        <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
              Recomendações (mês mais recente)
            </span>
            <span className="text-[11px] text-ink-faint">{total} analistas</span>
          </div>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-surface">
            <Segment value={latest.strongBuy} total={total} tone="bg-positive" />
            <Segment value={latest.buy} total={total} tone="bg-positive/70" />
            <Segment value={latest.hold} total={total} tone="bg-ink-faint/40" />
            <Segment value={latest.sell} total={total} tone="bg-negative/70" />
            <Segment value={latest.strongSell} total={total} tone="bg-negative" />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2 text-[10px] text-ink-muted">
            <Legend label="Strong Buy" value={latest.strongBuy} />
            <Legend label="Buy" value={latest.buy} />
            <Legend label="Hold" value={latest.hold} />
            <Legend label="Sell" value={latest.sell} />
            <Legend label="Strong Sell" value={latest.strongSell} />
          </div>
        </div>
      )}

      {upgrades.length > 0 && (
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
              </tr>
            </thead>
            <tbody>
              {upgrades.slice(0, 8).map((u) => (
                <tr
                  key={`${u.date}-${u.firm}`}
                  className="border-b border-surface-border-light last:border-0"
                >
                  <td className="px-3 py-2 text-ink-muted">{u.date || "—"}</td>
                  <td className="px-3 py-2 font-semibold text-ink">{u.firm}</td>
                  <td className="px-3 py-2 text-ink-muted">
                    {u.fromGrade ? `${u.fromGrade} → ` : ""}
                    <span className="font-semibold text-ink">{u.toGrade ?? u.action ?? "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function Empty({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-surface-border-light bg-surface-muted px-3.5 py-3 text-[13px] text-ink-muted">
      {message}
    </p>
  );
}
