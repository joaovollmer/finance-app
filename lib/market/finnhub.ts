// Adapters Finnhub para dados financeiros gratuitos (Sprint v1.2-D, fase 2).
//
// Cobertura: tickers US/internacionais. Para B3 (.SA), o Finnhub tem dados
// fracos — esses adapters retornam null silenciosamente. Sem
// `FINNHUB_API_KEY`, todos retornam null e o app cai 100% no Yahoo Finance.
//
// Free tier: 60 req/min. Cada adapter cacheia em memória por 30 min — uma
// única visita à página `/ativo/[ticker]` consome no máximo 6 calls.
//
// Docs base: https://finnhub.io/docs/api

import * as Sentry from "@sentry/nextjs";
import { parseJsonResponse } from "./http";

const BASE = "https://finnhub.io/api/v1";
const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { value: unknown; fetchedAt: number }>();

const B3_SUFFIX = ".SA";

export function finnhubEnabled(): boolean {
  return Boolean(process.env.FINNHUB_API_KEY);
}

// Retorna o símbolo sem `.SA`. Se for B3, devolve null — não tem ponto
// chamar Finnhub para PETR4. Algumas blue-chips B3 estão listadas nos EUA
// como ADR (ex.: PBR, VALE) e o caller pode tentar usar isso, mas o
// mapeamento ADR fica fora do escopo desta iteração.
function finnhubSymbol(rawTicker: string): string | null {
  const t = rawTicker.trim().toUpperCase();
  if (t.endsWith(B3_SUFFIX)) return null;
  if (/^[A-Z]{4}\d{1,2}$/.test(t)) return null;
  return t;
}

async function fhFetch<T>(
  path: string,
  searchParams: Record<string, string | number>,
  cacheKey: string
): Promise<T | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;

  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return cached.value as T;
  }

  const params = new URLSearchParams({
    ...Object.fromEntries(Object.entries(searchParams).map(([k, v]) => [k, String(v)])),
    token: key,
  });
  const url = `${BASE}${path}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) throw new Error(`Finnhub ${path} respondeu ${res.status}`);
    const data = await parseJsonResponse<T>(res, `Finnhub ${path}`);
    cache.set(cacheKey, { value: data, fetchedAt: now });
    return data;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "finnhub", path },
      extra: { cacheKey },
    });
    return null;
  }
}

// --- Quote --------------------------------------------------------------

export interface FinnhubQuote {
  /** Preço atual */
  c: number;
  /** Variação absoluta do dia */
  d: number | null;
  /** Variação percentual do dia */
  dp: number | null;
  /** Máxima do dia */
  h: number;
  /** Mínima do dia */
  l: number;
  /** Abertura do dia */
  o: number;
  /** Fechamento do dia anterior */
  pc: number;
  /** Timestamp UNIX */
  t: number;
}

export async function getFinnhubQuote(
  ticker: string
): Promise<FinnhubQuote | null> {
  const symbol = finnhubSymbol(ticker);
  if (!symbol) return null;
  const data = await fhFetch<FinnhubQuote>(
    "/quote",
    { symbol },
    `quote:${symbol}`
  );
  // Finnhub devolve `c: 0` quando o ticker não existe — tratamos como null.
  if (!data || !data.c || data.c <= 0) return null;
  return data;
}

// --- Company Profile ----------------------------------------------------

export interface FinnhubProfile {
  country?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  ipo?: string;
  logo?: string;
  marketCapitalization?: number; // em milhões de USD
  name?: string;
  phone?: string;
  shareOutstanding?: number;
  ticker?: string;
  weburl?: string;
}

export async function getFinnhubProfile(
  ticker: string
): Promise<FinnhubProfile | null> {
  const symbol = finnhubSymbol(ticker);
  if (!symbol) return null;
  const data = await fhFetch<FinnhubProfile>(
    "/stock/profile2",
    { symbol },
    `profile:${symbol}`
  );
  if (!data || Object.keys(data).length === 0) return null;
  return data;
}

// --- Financial Metrics --------------------------------------------------
// Endpoint /stock/metric?metric=all devolve dezenas de indicadores
// agrupados em `metric` (campos chave) e `series` (histórico). Mantemos só
// os campos que efetivamente usamos na UI para não inflar a API surface.

interface RawMetricResponse {
  metric?: {
    "10DayAverageTradingVolume"?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    "52WeekPriceReturnDaily"?: number;
    beta?: number;
    bookValuePerShareAnnual?: number;
    currentRatioAnnual?: number;
    dividendYieldIndicatedAnnual?: number;
    dividendsPerShareAnnual?: number;
    ebitdPerShareTTM?: number;
    epsBasicExclExtraItemsAnnual?: number;
    epsTTM?: number;
    grossMarginAnnual?: number;
    grossMarginTTM?: number;
    longTermDebtTotalEquityAnnual?: number;
    marketCapitalization?: number;
    netDebtAnnual?: number;
    netProfitMarginAnnual?: number;
    netProfitMarginTTM?: number;
    operatingMarginAnnual?: number;
    operatingMarginTTM?: number;
    payoutRatioAnnual?: number;
    pbAnnual?: number;
    peAnnual?: number;
    peExclExtraTTM?: number;
    pegRatio?: number;
    priceRelativeToSP50026Week?: number;
    revenueGrowthTTMYoy?: number;
    roaAnnual?: number;
    roeAnnual?: number;
    roeTTM?: number;
    roiTTM?: number;
    totalDebtTotalEquityAnnual?: number;
  };
}

export interface FinnhubMetrics {
  marketCap?: number; // já normalizado para USD (não em milhões)
  beta?: number;
  trailingPE?: number;
  forwardPEG?: number;
  priceToBook?: number;
  eps?: number;
  dividendYield?: number; // fração decimal (ex.: 0.04 = 4%)
  payoutRatio?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  roe?: number;
  roa?: number;
  debtToEquity?: number;
  currentRatio?: number;
  revenueGrowthYoy?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekChangePercent?: number;
  relativeToSP500_26w?: number;
}

export async function getFinnhubMetrics(
  ticker: string
): Promise<FinnhubMetrics | null> {
  const symbol = finnhubSymbol(ticker);
  if (!symbol) return null;
  const raw = await fhFetch<RawMetricResponse>(
    "/stock/metric",
    { symbol, metric: "all" },
    `metric:${symbol}`
  );
  if (!raw?.metric) return null;
  return mapMetrics(raw.metric);
}

export function mapMetrics(m: RawMetricResponse["metric"]): FinnhubMetrics {
  if (!m) return {};
  // Finnhub devolve dividend yield e margens já em percentual (ex.: 4.2 =
  // 4.2%). Normalizamos para fração para combinar com Yahoo.
  const toFraction = (v?: number) =>
    typeof v === "number" ? v / 100 : undefined;
  const marketCap = m.marketCapitalization;
  return {
    marketCap: marketCap !== undefined ? marketCap * 1_000_000 : undefined,
    beta: m.beta,
    trailingPE: m.peExclExtraTTM ?? m.peAnnual,
    forwardPEG: m.pegRatio,
    priceToBook: m.pbAnnual,
    eps: m.epsTTM ?? m.epsBasicExclExtraItemsAnnual,
    dividendYield: toFraction(m.dividendYieldIndicatedAnnual),
    payoutRatio: toFraction(m.payoutRatioAnnual),
    grossMargin: toFraction(m.grossMarginTTM ?? m.grossMarginAnnual),
    operatingMargin: toFraction(m.operatingMarginTTM ?? m.operatingMarginAnnual),
    netMargin: toFraction(m.netProfitMarginTTM ?? m.netProfitMarginAnnual),
    roe: toFraction(m.roeTTM ?? m.roeAnnual),
    roa: toFraction(m.roaAnnual),
    debtToEquity: m.totalDebtTotalEquityAnnual,
    currentRatio: m.currentRatioAnnual,
    revenueGrowthYoy: toFraction(m.revenueGrowthTTMYoy),
    fiftyTwoWeekHigh: m["52WeekHigh"],
    fiftyTwoWeekLow: m["52WeekLow"],
    fiftyTwoWeekChangePercent: toFraction(m["52WeekPriceReturnDaily"]),
    relativeToSP500_26w: toFraction(m.priceRelativeToSP50026Week),
  };
}

// --- Recommendations ----------------------------------------------------

export interface FinnhubRecommendation {
  period: string; // YYYY-MM-DD
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export async function getFinnhubRecommendations(
  ticker: string
): Promise<FinnhubRecommendation[]> {
  const symbol = finnhubSymbol(ticker);
  if (!symbol) return [];
  const data = await fhFetch<FinnhubRecommendation[]>(
    "/stock/recommendation",
    { symbol },
    `recommendation:${symbol}`
  );
  return Array.isArray(data) ? data : [];
}

// --- Price Target -------------------------------------------------------

export interface FinnhubPriceTarget {
  lastUpdated: string;
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
}

export async function getFinnhubPriceTarget(
  ticker: string
): Promise<FinnhubPriceTarget | null> {
  const symbol = finnhubSymbol(ticker);
  if (!symbol) return null;
  const data = await fhFetch<FinnhubPriceTarget>(
    "/stock/price-target",
    { symbol },
    `target:${symbol}`
  );
  // Finnhub devolve {symbol:"X", targetMean:0, ...} para tickers sem
  // cobertura. Filtramos esses.
  if (!data || !data.targetMean || data.targetMean <= 0) return null;
  return data;
}

// --- Earnings Surprises -------------------------------------------------

export interface FinnhubEarnings {
  actual: number;
  estimate: number;
  period: string;
  quarter: number;
  surprise: number;
  surprisePercent: number;
  symbol: string;
  year: number;
}

export async function getFinnhubEarnings(
  ticker: string
): Promise<FinnhubEarnings[]> {
  const symbol = finnhubSymbol(ticker);
  if (!symbol) return [];
  const data = await fhFetch<FinnhubEarnings[]>(
    "/stock/earnings",
    { symbol },
    `earnings:${symbol}`
  );
  return Array.isArray(data) ? data : [];
}
