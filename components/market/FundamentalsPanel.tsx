"use client";

import { useState } from "react";
import type { AssetFundamentals } from "@/lib/market/types";
import InfoTooltip from "@/components/ui/InfoTooltip";
import Modal from "@/components/ui/Modal";
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
  const [helpOpen, setHelpOpen] = useState(false);
  const latest = trend[0];
  const total = latest
    ? latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {latest && total > 0 && (
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="group rounded-xl border border-surface-border-light bg-surface-muted p-4 text-left transition hover:border-brand-border hover:bg-brand-pastel/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
          aria-label="Ver explicação detalhada sobre as recomendações de analistas"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
              Recomendações (mês mais recente)
            </span>
            <span className="flex items-center gap-2 text-[11px] text-ink-faint">
              {total} analistas
              <span
                aria-hidden
                className="inline-flex h-5 items-center gap-1 rounded-full border border-surface-border bg-surface px-2 text-[10px] font-semibold text-brand transition group-hover:border-brand-border"
              >
                <span>?</span>
                <span className="hidden sm:inline">Como ler</span>
              </span>
            </span>
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
          <p className="mt-3 text-[11px] text-brand">
            Clique para entender como essas recomendações são formadas →
          </p>
        </button>
      )}

      <RatingsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />


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
            Bancos de investimento, corretoras e casas de análise
            (Goldman Sachs, JP Morgan, XP, BTG Pactual, Morgan Stanley,
            etc.) empregam analistas que estudam as empresas em
            profundidade — leem balanços, conversam com a diretoria,
            visitam operações e constroem modelos de fluxo de caixa
            descontado. Cada casa publica periodicamente uma
            classificação para o ativo. O agregado dessas opiniões é o
            que você vê na barra colorida.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-ink">
            As 5 classificações padrão
          </h3>
          <ul className="flex flex-col gap-2.5">
            <Rating
              tone="bg-positive"
              label="Strong Buy"
              description="Convicção alta de que o preço vai subir bem acima da média do mercado nos próximos 6–12 meses. O analista acredita que o ativo está significativamente subvalorizado."
            />
            <Rating
              tone="bg-positive/70"
              label="Buy"
              description="Expectativa de retorno acima do mercado, mas com menos convicção que Strong Buy. Bom risco-retorno percebido."
            />
            <Rating
              tone="bg-ink-faint/40"
              label="Hold (Neutro / Market Perform)"
              description="Espera-se que o ativo acompanhe o mercado, sem desempenho excepcional para nenhum dos lados. Não é venda — é 'fique no que você tem'."
            />
            <Rating
              tone="bg-negative/70"
              label="Sell (Underperform)"
              description="Expectativa de retorno abaixo do mercado. O analista vê melhores alternativas ou riscos relevantes no curto prazo."
            />
            <Rating
              tone="bg-negative"
              label="Strong Sell"
              description="Convicção alta de queda significativa ou deterioração fundamental. Costuma ser raro — as casas evitam vender a ideia para não queimar relacionamento com a empresa."
            />
          </ul>
        </section>

        <section>
          <h3 className="mb-1.5 text-sm font-bold text-ink">
            Sobre o que cada analista olha?
          </h3>
          <ul className="ml-4 list-disc text-[13px] leading-relaxed text-ink-muted">
            <li>
              <strong className="font-semibold text-ink">
                Múltiplos atuais
              </strong>{" "}
              (P/L, EV/EBITDA, P/VP) comparados ao setor e ao histórico
              da própria empresa.
            </li>
            <li>
              <strong className="font-semibold text-ink">
                Projeções de lucro e receita
              </strong>{" "}
              construídas com base em guidance da diretoria, dados macro
              (juros, câmbio, PIB), preço de commodities, dinâmica
              competitiva.
            </li>
            <li>
              <strong className="font-semibold text-ink">
                Preço-alvo (target price)
              </strong>
              : valor que o analista projeta para o ativo em 12 meses.
              A diferença entre target e cotação atual é o{" "}
              <em>upside potencial</em>.
            </li>
            <li>
              <strong className="font-semibold text-ink">Catalisadores</strong>
              : eventos esperados que destravem (ou destruam) valor —
              fusões, novos produtos, ciclos regulatórios.
            </li>
            <li>
              <strong className="font-semibold text-ink">Riscos</strong>
              : litígios, dependência de cliente único, exposição
              cambial, governança, ESG.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1.5 text-sm font-bold text-ink">
            Como interpretar o consenso
          </h3>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Uma barra majoritariamente verde indica consenso otimista
            entre os analistas. Mais Hold do que Buy/Sell costuma
            significar que o mercado já precificou as boas notícias
            mais óbvias — o ativo precisaria de um catalisador novo
            para destravar valor. Polarização (muitos Buy + muitos
            Sell) sugere uma tese controversa, geralmente em momentos
            de virada (turnaround, mudança de gestão, M&amp;A).
          </p>
        </section>

        <section>
          <h3 className="mb-1.5 text-sm font-bold text-ink">
            Por que NÃO seguir cegamente?
          </h3>
          <ul className="ml-4 list-disc text-[13px] leading-relaxed text-ink-muted">
            <li>
              Analistas têm{" "}
              <strong className="font-semibold text-ink">
                conflitos de interesse
              </strong>
              : a corretora pode prestar serviços de banco de
              investimento para a empresa coberta.
            </li>
            <li>
              O{" "}
              <strong className="font-semibold text-ink">horizonte</strong>{" "}
              é tipicamente 6–12 meses. Para holding de longo prazo,
              tem peso menor.
            </li>
            <li>
              Recomendações{" "}
              <strong className="font-semibold text-ink">
                podem demorar para mudar
              </strong>{" "}
              após eventos relevantes — análises são revisadas a cada
              trimestre ou ao redor de earnings.
            </li>
            <li>
              O consenso é{" "}
              <strong className="font-semibold text-ink">
                média ponderada
              </strong>
              — pode esconder uma minoria muito convicta e correta,
              cuja tese só fica óbvia depois.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1.5 text-sm font-bold text-ink">
            Fonte e janela temporal
          </h3>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Os números exibidos vêm do Yahoo Finance, que agrega as
            classificações ativas reportadas pelas principais casas. A
            série mostra o mês mais recente; a tabela abaixo lista os
            upgrades/downgrades publicados, em ordem cronológica
            inversa.
          </p>
        </section>

        <div className="rounded-xl border border-brand-border bg-brand-pastel px-3.5 py-3 text-[12px] leading-relaxed text-brand">
          <strong className="font-bold">Importante:</strong> esta seção
          é informativa e educacional. Recomendações de analistas{" "}
          <strong className="font-bold">não são</strong> garantia de
          retorno futuro nem substituem análise própria. Em uma
          simulação como esta, use-as para aprender como o mercado lê
          ativos — não como sinal de compra/venda.
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
