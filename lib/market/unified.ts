// Camada unificada Yahoo + Finnhub (Sprint v1.2-D, fase 3).
//
// Objetivo: produzir uma única estrutura `UnifiedFundamentals` que substitui
// AssetSummary + AssetFundamentals + FinnhubExtras. Cada métrica vem com a
// fonte original anexada (Yahoo, Finnhub ou "calculated") e a fórmula usada
// quando precisamos derivar a partir de dados base — assim a UI consegue
// expor a proveniência via tooltip.

import type {
  AssetFundamentals,
  AssetSummary,
  BalanceSheetYear,
  CashflowYear,
  IncomeStatementYear,
  RecommendationTrend,
  UpgradeDowngrade,
} from "./types";
import type {
  FinnhubEarnings,
  FinnhubMetrics,
  FinnhubPriceTarget,
  FinnhubProfile,
  FinnhubRecommendation,
} from "./finnhub";

export type DataSource = "yahoo" | "finnhub" | "calculated";

export interface UnifiedMetric {
  value: number;
  source: DataSource;
  /** Anotada quando source="calculated". Texto curto explicando o cálculo. */
  formula?: string;
}

export interface UnifiedField<T> {
  value: T;
  source: DataSource;
}

export interface MergedRecommendation {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  /** Fonte do agregado (Yahoo, Finnhub ou Yahoo+Finnhub quando ambos). */
  source: "yahoo" | "finnhub" | "merged";
  total: number;
}

export interface UnifiedFundamentals {
  ticker: string;
  displayTicker: string;
  name: string;
  longName?: string;
  currency: string;
  exchange?: string;
  longBusinessSummary?: string;

  sector?: UnifiedField<string>;
  industry?: UnifiedField<string>;
  country?: UnifiedField<string>;
  website?: UnifiedField<string>;

  // Valor de mercado e múltiplos
  marketCap?: UnifiedMetric;
  trailingPE?: UnifiedMetric;
  forwardPE?: UnifiedMetric;
  priceToBook?: UnifiedMetric;
  trailingEps?: UnifiedMetric;
  dividendYield?: UnifiedMetric;
  beta?: UnifiedMetric;
  fiftyTwoWeekLow?: UnifiedMetric;
  fiftyTwoWeekHigh?: UnifiedMetric;
  fiftyTwoWeekChangePercent?: UnifiedMetric;
  averageVolume?: UnifiedMetric;

  // Margens e retornos
  grossMargin?: UnifiedMetric;
  operatingMargin?: UnifiedMetric;
  netMargin?: UnifiedMetric;
  returnOnEquity?: UnifiedMetric;
  returnOnAssets?: UnifiedMetric;

  // Estrutura de capital e liquidez
  debtToEquity?: UnifiedMetric;
  currentRatio?: UnifiedMetric;
  netDebtToEbitda?: UnifiedMetric;

  // Crescimento e valuation
  payoutRatio?: UnifiedMetric;
  revenueGrowthYoy?: UnifiedMetric;
  pegRatio?: UnifiedMetric;
  evEbitda?: UnifiedMetric;
  relativeToSP500_26w?: UnifiedMetric;

  // Demonstrativos anuais (Yahoo)
  income: IncomeStatementYear[];
  balance: BalanceSheetYear[];
  cashflow: CashflowYear[];

  // Recomendações consolidadas + atualizações de analistas (Yahoo)
  recommendations: MergedRecommendation | null;
  upgrades: UpgradeDowngrade[];

  // Sinais Finnhub-only
  priceTarget: FinnhubPriceTarget | null;
  earnings: FinnhubEarnings[];
}

// --- Helpers -----------------------------------------------------------

function metric(
  value: number | undefined,
  source: DataSource,
  formula?: string
): UnifiedMetric | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return { value, source, formula };
}

function pick(
  yahoo: number | undefined,
  finnhub: number | undefined
): UnifiedMetric | undefined {
  return metric(yahoo, "yahoo") ?? metric(finnhub, "finnhub");
}

function pickField(
  yahoo: string | undefined,
  finnhub: string | undefined
): UnifiedField<string> | undefined {
  if (yahoo && yahoo.trim()) return { value: yahoo, source: "yahoo" };
  if (finnhub && finnhub.trim()) return { value: finnhub, source: "finnhub" };
  return undefined;
}

/** Tenta calcular a partir das funções de fallback até obter um valor finito. */
function tryCalc(
  attempts: Array<{ formula: string; compute: () => number | undefined }>
): UnifiedMetric | undefined {
  for (const a of attempts) {
    const v = a.compute();
    if (v !== undefined && Number.isFinite(v))
      return { value: v, source: "calculated", formula: a.formula };
  }
  return undefined;
}

// --- Merge principal ---------------------------------------------------

export interface UnifyInput {
  ticker: string;
  displayTicker: string;
  currency: string;
  // Yahoo
  summary: AssetSummary | null;
  fundamentals: AssetFundamentals | null;
  // Finnhub
  metrics: FinnhubMetrics | null;
  profile: FinnhubProfile | null;
  finnhubRecommendations: FinnhubRecommendation[];
  priceTarget: FinnhubPriceTarget | null;
  earnings: FinnhubEarnings[];
}

export function buildUnifiedFundamentals(
  input: UnifyInput
): UnifiedFundamentals {
  const { summary, fundamentals, metrics, profile, currency } = input;
  const latestIncome = fundamentals?.income[0];
  const latestBalance = fundamentals?.balance[0];

  // ---- Valuation / pricing -------------------------------------------
  const marketCap = pick(summary?.marketCap, metrics?.marketCap);

  const trailingPE = pick(summary?.trailingPE, metrics?.trailingPE);
  const forwardPE = metric(summary?.forwardPE, "yahoo");
  const priceToBook = pick(summary?.priceToBook, metrics?.priceToBook);
  const trailingEps = pick(summary?.trailingEps, metrics?.eps);
  const dividendYield = pick(summary?.dividendYield, metrics?.dividendYield);
  const beta = pick(summary?.beta, metrics?.beta);

  const fiftyTwoWeekLow = pick(
    summary?.fiftyTwoWeekLow,
    metrics?.fiftyTwoWeekLow
  );
  const fiftyTwoWeekHigh = pick(
    summary?.fiftyTwoWeekHigh,
    metrics?.fiftyTwoWeekHigh
  );
  const fiftyTwoWeekChangePercent = pick(
    summary?.fiftyTwoWeekChangePercent,
    metrics?.fiftyTwoWeekChangePercent
  );
  const averageVolume = metric(summary?.averageVolume, "yahoo");

  // ---- Margens (com fallback de cálculo via DRE Yahoo) ----------------
  const grossMargin =
    pick(undefined, metrics?.grossMargin) ??
    tryCalc([
      {
        formula: "lucro bruto ÷ receita",
        compute: () => {
          const r = latestIncome?.totalRevenue;
          const g = latestIncome?.grossProfit;
          if (r && g && r !== 0) return g / r;
          return undefined;
        },
      },
    ]);

  const operatingMargin =
    pick(undefined, metrics?.operatingMargin) ??
    tryCalc([
      {
        formula: "lucro operacional ÷ receita",
        compute: () => {
          const r = latestIncome?.totalRevenue;
          const o = latestIncome?.operatingIncome;
          if (r && o !== undefined && r !== 0) return o / r;
          return undefined;
        },
      },
    ]);

  const netMargin =
    pick(summary?.profitMargins, metrics?.netMargin) ??
    tryCalc([
      {
        formula: "lucro líquido ÷ receita",
        compute: () => {
          const r = latestIncome?.totalRevenue;
          const n = latestIncome?.netIncome;
          if (r && n !== undefined && r !== 0) return n / r;
          return undefined;
        },
      },
    ]);

  // ---- ROE / ROA -----------------------------------------------------
  const returnOnEquity =
    pick(summary?.returnOnEquity, metrics?.roe) ??
    tryCalc([
      {
        formula: "lucro líquido ÷ patrimônio líquido",
        compute: () => {
          const e = latestBalance?.totalEquity;
          const n = latestIncome?.netIncome;
          if (e && n !== undefined && e !== 0) return n / e;
          return undefined;
        },
      },
    ]);

  const returnOnAssets =
    pick(undefined, metrics?.roa) ??
    tryCalc([
      {
        formula: "lucro líquido ÷ ativo total",
        compute: () => {
          const a = latestBalance?.totalAssets;
          const n = latestIncome?.netIncome;
          if (a && n !== undefined && a !== 0) return n / a;
          return undefined;
        },
      },
    ]);

  // ---- Estrutura de capital -----------------------------------------
  const debtToEquity =
    pick(undefined, metrics?.debtToEquity) ??
    tryCalc([
      {
        formula: "dívida total ÷ patrimônio líquido × 100",
        compute: () => {
          const e = latestBalance?.totalEquity;
          const d = latestBalance?.totalDebt;
          if (e && d !== undefined && e !== 0) return (d / e) * 100;
          return undefined;
        },
      },
    ]);

  const netDebtToEbitda =
    metric(fundamentals?.derived.netDebtToEbitda, "calculated", "(dívida − caixa) ÷ EBITDA") ??
    tryCalc([
      {
        formula: "(dívida − caixa) ÷ EBITDA",
        compute: () => {
          const ebitda = latestIncome?.ebitda;
          const debt = latestBalance?.totalDebt ?? 0;
          const cash = latestBalance?.totalCash ?? 0;
          if (ebitda && ebitda !== 0) return (debt - cash) / ebitda;
          return undefined;
        },
      },
    ]);

  const currentRatio = pick(undefined, metrics?.currentRatio);

  // ---- Crescimento e valuation --------------------------------------
  const payoutRatio =
    pick(undefined, metrics?.payoutRatio) ??
    metric(
      fundamentals?.derived.payoutRatio,
      "calculated",
      "dividendos pagos ÷ lucro líquido"
    );

  const revenueGrowthYoy =
    pick(undefined, metrics?.revenueGrowthYoy) ??
    tryCalc([
      {
        formula: "receita atual ÷ receita anterior − 1",
        compute: () => {
          const cur = fundamentals?.income[0]?.totalRevenue;
          const prev = fundamentals?.income[1]?.totalRevenue;
          if (cur && prev && prev !== 0) return cur / prev - 1;
          return undefined;
        },
      },
    ]);

  const pegRatio = pick(undefined, metrics?.forwardPEG);

  const evEbitda =
    metric(
      fundamentals?.derived.evEbitda,
      "calculated",
      "(market cap + dívida − caixa) ÷ EBITDA"
    ) ??
    tryCalc([
      {
        formula: "(market cap + dívida − caixa) ÷ EBITDA",
        compute: () => {
          const mcap = summary?.marketCap ?? metrics?.marketCap;
          const ebitda = latestIncome?.ebitda;
          const debt = latestBalance?.totalDebt ?? 0;
          const cash = latestBalance?.totalCash ?? 0;
          if (mcap && ebitda && ebitda !== 0)
            return (mcap + debt - cash) / ebitda;
          return undefined;
        },
      },
    ]);

  const relativeToSP500_26w = pick(undefined, metrics?.relativeToSP500_26w);

  // ---- Recomendações: pega o maior conjunto de cobertura -------------
  const recommendations = mergeRecommendations(
    fundamentals?.recommendations ?? [],
    input.finnhubRecommendations
  );

  return {
    ticker: input.ticker,
    displayTicker: input.displayTicker,
    name: summary?.name ?? input.displayTicker,
    longName: summary?.longName,
    currency,
    exchange: summary?.exchange,
    longBusinessSummary: summary?.longBusinessSummary,

    sector: pickField(summary?.sector, profile?.finnhubIndustry),
    industry: pickField(summary?.industry, profile?.finnhubIndustry),
    country: pickField(summary?.country, profile?.country),
    website: pickField(summary?.website, profile?.weburl),

    marketCap,
    trailingPE,
    forwardPE,
    priceToBook,
    trailingEps,
    dividendYield,
    beta,
    fiftyTwoWeekLow,
    fiftyTwoWeekHigh,
    fiftyTwoWeekChangePercent,
    averageVolume,

    grossMargin,
    operatingMargin,
    netMargin,
    returnOnEquity,
    returnOnAssets,

    debtToEquity,
    currentRatio,
    netDebtToEbitda,

    payoutRatio,
    revenueGrowthYoy,
    pegRatio,
    evEbitda,
    relativeToSP500_26w,

    income: fundamentals?.income ?? [],
    balance: fundamentals?.balance ?? [],
    cashflow: fundamentals?.cashflow ?? [],

    recommendations,
    upgrades: fundamentals?.upgrades ?? [],

    priceTarget: input.priceTarget,
    earnings: input.earnings,
  };
}

// --- Merge de recomendações --------------------------------------------
//
// Yahoo devolve `recommendationTrend` por janela mensal ("0m", "-1m", ...).
// Finnhub devolve um array por mês ("2026-05-01"). Para mostrar uma única
// barra, preferimos o agregado com maior cobertura (mais analistas) entre
// os dois. Quando ambos têm dados similares, mesclamos somando as contagens
// (analistas geralmente são diferentes entre as fontes — a contagem
// somada superestima um pouco mas reflete melhor a cobertura disponível).

export function mergeRecommendations(
  yahoo: RecommendationTrend[],
  finnhub: FinnhubRecommendation[]
): MergedRecommendation | null {
  const yLatest = pickYahooLatest(yahoo);
  const fLatest = finnhub[0] ?? null;
  if (!yLatest && !fLatest) return null;
  if (!yLatest && fLatest) {
    return totalize({
      period: fLatest.period,
      strongBuy: fLatest.strongBuy,
      buy: fLatest.buy,
      hold: fLatest.hold,
      sell: fLatest.sell,
      strongSell: fLatest.strongSell,
      source: "finnhub",
    });
  }
  if (yLatest && !fLatest) {
    return totalize({
      period: yLatest.period,
      strongBuy: yLatest.strongBuy,
      buy: yLatest.buy,
      hold: yLatest.hold,
      sell: yLatest.sell,
      strongSell: yLatest.strongSell,
      source: "yahoo",
    });
  }
  // ambos têm — somamos contagens
  return totalize({
    period: fLatest!.period,
    strongBuy: yLatest!.strongBuy + fLatest!.strongBuy,
    buy: yLatest!.buy + fLatest!.buy,
    hold: yLatest!.hold + fLatest!.hold,
    sell: yLatest!.sell + fLatest!.sell,
    strongSell: yLatest!.strongSell + fLatest!.strongSell,
    source: "merged",
  });
}

function pickYahooLatest(
  trends: RecommendationTrend[]
): RecommendationTrend | null {
  if (trends.length === 0) return null;
  // Yahoo costuma vir ordenado mais recente → mais antigo, mas garantimos.
  const sorted = [...trends].sort((a, b) => a.period.localeCompare(b.period));
  return sorted[0] ?? null;
}

function totalize(
  r: Omit<MergedRecommendation, "total">
): MergedRecommendation {
  return {
    ...r,
    total: r.strongBuy + r.buy + r.hold + r.sell + r.strongSell,
  };
}

// Constrói URL de busca do Google News para "<casa> <ticker>". Útil para
// linkar uma entrada de upgrade/downgrade à cobertura jornalística que
// noticiou a recomendação.
export function newsSearchUrl(firm: string, displayTicker: string): string {
  const q = encodeURIComponent(`${firm} ${displayTicker}`);
  return `https://news.google.com/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
}

// --- Tradução do source para texto da UI ------------------------------

export function describeSource(source: DataSource | "merged"): string {
  switch (source) {
    case "yahoo":
      return "Fonte: Yahoo Finance.";
    case "finnhub":
      return "Fonte: Finnhub.";
    case "calculated":
      return "Calculado a partir dos demonstrativos (Yahoo).";
    case "merged":
      return "Consenso combinando Yahoo Finance e Finnhub.";
  }
}
