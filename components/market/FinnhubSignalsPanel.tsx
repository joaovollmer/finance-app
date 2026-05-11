import type {
  FinnhubEarnings,
  FinnhubInsiderRecord,
  FinnhubPriceTarget,
  FinnhubRecommendation,
} from "@/lib/market/finnhub";
import type { FinnhubExtras } from "@/lib/market/aggregate";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { GLOSSARY } from "@/lib/glossary";

interface Props {
  currency: string;
  currentPrice: number;
  priceTarget: FinnhubPriceTarget | null;
  insiders: FinnhubInsiderRecord[];
  earnings: FinnhubEarnings[];
  recommendations: FinnhubRecommendation[];
  extras: FinnhubExtras;
}

function fmtPrice(v: number | undefined, currency: string): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
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

function fmtNumber(v: number | undefined, digits = 2): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export default function FinnhubSignalsPanel({
  currency,
  currentPrice,
  priceTarget,
  insiders,
  earnings,
  recommendations,
  extras,
}: Props) {
  const hasAnything =
    priceTarget !== null ||
    insiders.length > 0 ||
    earnings.length > 0 ||
    recommendations.length > 0 ||
    hasAnyExtra(extras);

  if (!hasAnything) {
    return (
      <p className="text-[13px] text-ink-muted">
        Finnhub não tem dados publicados para este ativo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {priceTarget && (
        <PriceTargetCard
          currency={currency}
          currentPrice={currentPrice}
          target={priceTarget}
        />
      )}

      {hasAnyExtra(extras) && <ExtrasGrid extras={extras} />}

      {recommendations.length > 0 && (
        <RecommendationStrip trend={recommendations[0]} />
      )}

      {earnings.length > 0 && (
        <EarningsTable earnings={earnings} currency={currency} />
      )}

      {insiders.length > 0 && (
        <InsiderTable insiders={insiders} currency={currency} />
      )}

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Dados Finnhub (free tier). Cobertura para tickers `.SA` é
        limitada — quando o painel aparece vazio, é porque a fonte não
        publicou nada para o ativo.
      </p>
    </div>
  );
}

function hasAnyExtra(e: FinnhubExtras): boolean {
  return Object.values(e).some((v) => v !== undefined);
}

function PriceTargetCard({
  currency,
  currentPrice,
  target,
}: {
  currency: string;
  currentPrice: number;
  target: FinnhubPriceTarget;
}) {
  // Coerce em janela [min, max] que inclua o preço atual + alvos. O
  // marker do current pode cair fora dos alvos se o ativo subiu/desceu
  // muito desde a última publicação dos analistas.
  const min = Math.min(target.targetLow, currentPrice);
  const max = Math.max(target.targetHigh, currentPrice);
  const range = max - min || 1;
  const pos = (v: number) => ((v - min) / range) * 100;

  const upside = ((target.targetMean - currentPrice) / currentPrice) * 100;

  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
          Preço-alvo dos analistas
          <InfoTooltip content={GLOSSARY.priceTarget} />
        </span>
        <span className="text-[10px] text-ink-faint">
          atualizado em {target.lastUpdated}
        </span>
      </div>

      <div className="relative mt-5 mb-7 h-2 rounded-full bg-surface">
        {/* Faixa low → high */}
        <div
          className="absolute top-0 h-2 rounded-full bg-brand-pastel"
          style={{
            left: `${pos(target.targetLow)}%`,
            width: `${pos(target.targetHigh) - pos(target.targetLow)}%`,
          }}
        />
        {/* Mediana */}
        <Marker
          pos={pos(target.targetMedian)}
          color="bg-brand"
          label="mediana"
          value={fmtPrice(target.targetMedian, currency)}
        />
        {/* Atual */}
        <Marker
          pos={pos(currentPrice)}
          color="bg-ink"
          label="atual"
          value={fmtPrice(currentPrice, currency)}
          below
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-[12px]">
        <Cell label="Mínimo" value={fmtPrice(target.targetLow, currency)} />
        <Cell label="Médio" value={fmtPrice(target.targetMean, currency)} />
        <Cell label="Máximo" value={fmtPrice(target.targetHigh, currency)} />
      </div>

      <div
        className={`mt-3 rounded-lg px-3 py-2 text-[12px] font-semibold ${
          upside >= 0
            ? "bg-positive-pastel text-positive"
            : "bg-negative-pastel text-negative"
        }`}
      >
        Potencial de {upside >= 0 ? "valorização" : "desvalorização"}:{" "}
        {fmtPct(upside, true)} até a média dos analistas
      </div>
    </div>
  );
}

function Marker({
  pos,
  color,
  label,
  value,
  below = false,
}: {
  pos: number;
  color: string;
  label: string;
  value: string;
  below?: boolean;
}) {
  return (
    <div
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos}%` }}
    >
      <div className={`h-4 w-1 rounded-full ${color}`} />
      <div
        className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold ${
          below ? "top-full mt-1.5" : "bottom-full mb-1.5"
        } text-ink-muted`}
      >
        {label} · <span className="tabular text-ink">{value}</span>
      </div>
    </div>
  );
}

function ExtrasGrid({ extras }: { extras: FinnhubExtras }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        Indicadores complementares
        <InfoTooltip content="Métricas adicionais que o Finnhub publica e o Yahoo não traz por padrão." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Payout" tooltip={GLOSSARY.payoutRatio} value={fmtPct(extras.payoutRatio)} />
        <Stat label="Margem bruta" tooltip={GLOSSARY.grossMargin} value={fmtPct(extras.grossMargin)} />
        <Stat label="Margem operacional" tooltip={GLOSSARY.operatingMargin} value={fmtPct(extras.operatingMargin)} />
        <Stat label="ROA" tooltip={GLOSSARY.roa} value={fmtPct(extras.roa)} />
        <Stat label="Dívida / Patrimônio" tooltip={GLOSSARY.debtToEquity} value={fmtNumber(extras.debtToEquity)} />
        <Stat label="Liquidez corrente" tooltip={GLOSSARY.currentRatio} value={fmtNumber(extras.currentRatio)} />
        <Stat label="Crescimento receita (YoY)" tooltip={GLOSSARY.revenueGrowthYoy} value={fmtPct(extras.revenueGrowthYoy)} />
        <Stat label="PEG" tooltip={GLOSSARY.pegRatio} value={fmtNumber(extras.forwardPEG)} />
        <Stat label="vs S&P 500 (26s)" tooltip={GLOSSARY.relativeToSP500} value={fmtPct(extras.relativeToSP500_26w)} />
      </div>
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
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        {label}
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <div className="tabular mt-1 text-[14px] font-bold text-ink">{value}</div>
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

function RecommendationStrip({ trend }: { trend: FinnhubRecommendation }) {
  const total =
    trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
  if (total === 0) return null;
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
          Consenso (Finnhub)
          <InfoTooltip content="Agregação Finnhub de recomendações de casas de análise, atualizada mensalmente. Estados: Strong Buy / Buy / Hold / Sell / Strong Sell." />
        </span>
        <span className="text-[10px] text-ink-faint">
          {total} analistas · {trend.period}
        </span>
      </div>
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-surface">
        <Segment value={trend.strongBuy} total={total} tone="bg-positive" />
        <Segment value={trend.buy} total={total} tone="bg-positive/70" />
        <Segment value={trend.hold} total={total} tone="bg-ink-faint/40" />
        <Segment value={trend.sell} total={total} tone="bg-negative/70" />
        <Segment value={trend.strongSell} total={total} tone="bg-negative" />
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2 text-[10px] text-ink-muted">
        <Legend label="Strong Buy" value={trend.strongBuy} />
        <Legend label="Buy" value={trend.buy} />
        <Legend label="Hold" value={trend.hold} />
        <Legend label="Sell" value={trend.sell} />
        <Legend label="Strong Sell" value={trend.strongSell} />
      </div>
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

function EarningsTable({
  earnings,
  currency,
}: {
  earnings: FinnhubEarnings[];
  currency: string;
}) {
  const last = earnings.slice(0, 4);
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        Surpresas de earnings (últimos trimestres)
        <InfoTooltip content={GLOSSARY.earningsSurprise} />
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
                  {fmtPrice(e.estimate, currency)}
                </td>
                <td className="tabular px-3 py-2 text-right font-semibold text-ink">
                  {fmtPrice(e.actual, currency)}
                </td>
                <td
                  className={`tabular px-3 py-2 text-right font-semibold ${
                    e.surprise >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {e.surprise >= 0 ? "+" : ""}
                  {fmtPrice(e.surprise, currency)}
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

function InsiderTable({
  insiders,
  currency,
}: {
  insiders: FinnhubInsiderRecord[];
  currency: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
        Transações de insiders (recentes)
        <InfoTooltip content={GLOSSARY.insiderTransactions} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-surface-border-light">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-surface-border-light bg-surface-muted">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                Data
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                Insider
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                Variação
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                Preço
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
                Código
              </th>
            </tr>
          </thead>
          <tbody>
            {insiders.map((r, i) => (
              <tr
                key={`${r.date}-${r.insider}-${i}`}
                className="border-b border-surface-border-light last:border-0"
              >
                <td className="px-3 py-2 text-ink-muted">{r.date}</td>
                <td className="px-3 py-2 font-semibold text-ink">
                  {r.insider}
                </td>
                <td
                  className={`tabular px-3 py-2 text-right font-semibold ${
                    r.change >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {r.change >= 0 ? "+" : ""}
                  {r.change.toLocaleString("pt-BR")}
                </td>
                <td className="tabular px-3 py-2 text-right text-ink-muted">
                  {r.price > 0 ? fmtPrice(r.price, currency) : "—"}
                </td>
                <td className="px-3 py-2 text-right text-ink-faint">
                  {r.transactionCode}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
