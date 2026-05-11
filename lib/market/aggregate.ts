// Camada de agregação Yahoo + Finnhub (Sprint v1.2-D).
//
// Estratégia geral: Yahoo é a fonte primária (cobre B3 e US). Finnhub
// preenche lacunas e adiciona indicadores que Yahoo não expõe (price
// target, transações de insiders, surpresas de earnings, mais métricas
// financeiras). Para B3 todos os adapters Finnhub retornam null, então
// o merge vira identidade — nada quebra.

import type { AssetSummary, Quote } from "./types";
import type {
  FinnhubMetrics,
  FinnhubProfile,
  FinnhubQuote,
} from "./finnhub";

// Para valores opcionais: usa o primeiro definido. Útil para tabular
// "Yahoo OR Finnhub OR undefined".
function firstDefined<T>(...values: (T | undefined)[]): T | undefined {
  for (const v of values) if (v !== undefined) return v;
  return undefined;
}

export interface MergedQuote extends Quote {
  /** Máxima do dia (Finnhub). */
  dayHigh?: number;
  /** Mínima do dia (Finnhub). */
  dayLow?: number;
  /** Abertura do dia (Finnhub). */
  dayOpen?: number;
}

export function mergeQuote(
  yahoo: Quote,
  finnhub: FinnhubQuote | null
): MergedQuote {
  if (!finnhub) return yahoo;
  // Yahoo é a fonte de verdade para o preço exibido (consistência com a
  // ordem, conversão FX etc.). Finnhub só adiciona high/low/open.
  return {
    ...yahoo,
    dayHigh: finnhub.h > 0 ? finnhub.h : undefined,
    dayLow: finnhub.l > 0 ? finnhub.l : undefined,
    dayOpen: finnhub.o > 0 ? finnhub.o : undefined,
  };
}

export function mergeSummary(
  yahoo: AssetSummary,
  metrics: FinnhubMetrics | null,
  profile: FinnhubProfile | null
): AssetSummary {
  if (!metrics && !profile) return yahoo;

  return {
    ...yahoo,
    // Profile complementa setor/indústria quando Yahoo não publica
    sector: yahoo.sector ?? profile?.finnhubIndustry,
    industry: yahoo.industry ?? profile?.finnhubIndustry,
    country: yahoo.country ?? profile?.country,
    website: yahoo.website ?? profile?.weburl,
    // Métricas: prefere Yahoo se já existe, completa com Finnhub
    marketCap: firstDefined(yahoo.marketCap, metrics?.marketCap),
    trailingPE: firstDefined(yahoo.trailingPE, metrics?.trailingPE),
    priceToBook: firstDefined(yahoo.priceToBook, metrics?.priceToBook),
    trailingEps: firstDefined(yahoo.trailingEps, metrics?.eps),
    dividendYield: firstDefined(yahoo.dividendYield, metrics?.dividendYield),
    beta: firstDefined(yahoo.beta, metrics?.beta),
    fiftyTwoWeekLow: firstDefined(yahoo.fiftyTwoWeekLow, metrics?.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: firstDefined(yahoo.fiftyTwoWeekHigh, metrics?.fiftyTwoWeekHigh),
    fiftyTwoWeekChangePercent: firstDefined(
      yahoo.fiftyTwoWeekChangePercent,
      metrics?.fiftyTwoWeekChangePercent
    ),
    profitMargins: firstDefined(yahoo.profitMargins, metrics?.netMargin),
    returnOnEquity: firstDefined(yahoo.returnOnEquity, metrics?.roe),
  };
}

// Indicadores extras que só vêm do Finnhub. Mantemos separados para a UI
// renderizar uma seção dedicada — assim fica claro para o usuário a
// proveniência do dado.
export interface FinnhubExtras {
  payoutRatio?: number;
  grossMargin?: number;
  operatingMargin?: number;
  roa?: number;
  debtToEquity?: number;
  currentRatio?: number;
  revenueGrowthYoy?: number;
  relativeToSP500_26w?: number;
  forwardPEG?: number;
}

export function extractFinnhubExtras(
  metrics: FinnhubMetrics | null
): FinnhubExtras {
  if (!metrics) return {};
  return {
    payoutRatio: metrics.payoutRatio,
    grossMargin: metrics.grossMargin,
    operatingMargin: metrics.operatingMargin,
    roa: metrics.roa,
    debtToEquity: metrics.debtToEquity,
    currentRatio: metrics.currentRatio,
    revenueGrowthYoy: metrics.revenueGrowthYoy,
    relativeToSP500_26w: metrics.relativeToSP500_26w,
    forwardPEG: metrics.forwardPEG,
  };
}
