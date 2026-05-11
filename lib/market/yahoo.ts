import yfDefault from "yahoo-finance2";
import type {
  AssetClass,
  AssetFundamentals,
  AssetSearchResult,
  AssetSummary,
  BalanceSheetYear,
  Candle,
  CashflowYear,
  HistoryRange,
  IncomeStatementYear,
  PeerQuote,
  Quote,
  RecommendationTrend,
  UpgradeDowngrade,
} from "./types";

// yahoo-finance2 v3 deixou de exportar uma instância pronta — agora a default
// export é a classe `YahooFinance` e precisamos chamar `new YahooFinance()`
// para obter um objeto com os métodos reais. Conforme o interop CJS/ESM o
// `import default` pode chegar como `{ default: Class }` em vez da classe
// direta; o fallback abaixo cobre os dois cenários. Tipamos como `any`
// porque os retornos são castados ponto-a-ponto adiante.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yfMod: any = yfDefault;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YahooFinanceCtor: any = yfMod?.default ?? yfMod;
const yahooFinance = new YahooFinanceCtor({
  suppressNotices: ["yahooSurvey"],
});

// Forma "achatada" do retorno de yahooFinance.quote(symbol).
// O tipo nativo do yahoo-finance2 é uma união discriminada por quoteType
// (EQUITY, ETF, CRYPTO, etc.); o TypeScript não consegue inferir o ramo a
// partir de uma string genérica e resolve para `never`. Como usamos só
// campos comuns às variantes de equity/ETF, declaramos um shape mínimo e
// fazemos cast.
type RawQuote = {
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  longName?: string;
  shortName?: string;
  currency?: string;
  marketState?: string;
  fullExchangeName?: string;
};

type RawCandle = {
  date: Date | string | number;
  close?: number | null;
};

type RawSearchQuote = {
  symbol?: string;
  exchange?: string;
  quoteType?: string;
  longname?: string;
  shortname?: string;
};

const B3_SUFFIX = ".SA";

// Usuário digita "PETR4" (B3) ou "AAPL" (EUA). Detectamos a classe pelo formato:
// tickers B3 têm o padrão XXXX[3-8] (4 letras + 1-2 dígitos) e adicionamos .SA.
function normalizeTicker(input: string): {
  yahooSymbol: string;
  displayTicker: string;
  assetClass: AssetClass;
} {
  const raw = input.trim().toUpperCase();
  if (raw.endsWith(B3_SUFFIX)) {
    return {
      yahooSymbol: raw,
      displayTicker: raw.slice(0, -B3_SUFFIX.length),
      assetClass: "stock_br",
    };
  }
  if (/^[A-Z]{4}\d{1,2}$/.test(raw)) {
    return {
      yahooSymbol: `${raw}${B3_SUFFIX}`,
      displayTicker: raw,
      assetClass: "stock_br",
    };
  }
  return { yahooSymbol: raw, displayTicker: raw, assetClass: "stock_us" };
}

export async function getQuote(input: string): Promise<Quote> {
  const { yahooSymbol, displayTicker, assetClass } = normalizeTicker(input);
  const q = (await yahooFinance.quote(yahooSymbol)) as RawQuote;

  const price = q.regularMarketPrice ?? 0;
  const previousClose = q.regularMarketPreviousClose ?? price;
  const change = price - previousClose;
  const changePercent =
    previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    ticker: yahooSymbol,
    displayTicker,
    name: q.longName ?? q.shortName ?? displayTicker,
    assetClass,
    currency: q.currency ?? (assetClass === "stock_br" ? "BRL" : "USD"),
    price,
    previousClose,
    change,
    changePercent,
    marketState: q.marketState,
    exchange: q.fullExchangeName,
  };
}

const RANGE_TO_PERIOD: Record<HistoryRange, number> = {
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
  "2y": 730,
  "5y": 1825,
};

export async function getHistory(
  input: string,
  range: HistoryRange
): Promise<Candle[]> {
  const { yahooSymbol } = normalizeTicker(input);
  const days = RANGE_TO_PERIOD[range];
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = (await yahooFinance.chart(yahooSymbol, {
    period1,
    interval: "1d",
  })) as { quotes?: RawCandle[] };

  return (result.quotes ?? [])
    .filter((c): c is RawCandle & { close: number } => typeof c.close === "number")
    .map((c) => ({
      date: (c.date instanceof Date ? c.date : new Date(c.date))
        .toISOString()
        .slice(0, 10),
      close: c.close,
    }));
}

export async function searchAssets(
  query: string
): Promise<AssetSearchResult[]> {
  const trimmed = query.trim().toUpperCase();
  if (trimmed.length < 1) return [];

  // O /search do Yahoo costuma não devolver o sufixo .SA quando o usuário
  // digita só "PETR4". Disparamos a busca duas vezes (com e sem .SA) quando o
  // input casa com o padrão B3 e fundimos os resultados.
  const isB3Pattern =
    /^[A-Z]{4}\d{1,2}$/.test(trimmed) && !trimmed.endsWith(B3_SUFFIX);
  const queries = [trimmed];
  if (isB3Pattern) queries.push(`${trimmed}${B3_SUFFIX}`);

  const responses = await Promise.all(
    queries.map((q) =>
      yahooFinance
        .search(q, { quotesCount: 10, newsCount: 0 })
        .catch(() => ({ quotes: [] as RawSearchQuote[] }))
    )
  );

  const out: AssetSearchResult[] = [];
  const seen = new Set<string>();

  for (const r of responses) {
    const quotes = (r as { quotes?: RawSearchQuote[] }).quotes ?? [];
    for (const item of quotes) {
      if (!item.symbol) continue;
      const { symbol, exchange, quoteType } = item;
      if (quoteType !== "EQUITY" && quoteType !== "ETF") continue;
      if (seen.has(symbol)) continue;
      seen.add(symbol);

      const isB3 = symbol.endsWith(B3_SUFFIX);
      out.push({
        ticker: symbol,
        displayTicker: isB3 ? symbol.slice(0, -B3_SUFFIX.length) : symbol,
        name: item.longname ?? item.shortname ?? symbol,
        assetClass: isB3 ? "stock_br" : "stock_us",
        exchange,
      });
    }
  }

  // Plano B: ticker B3 existe mas /search não retornou nada — confirmamos
  // direto pelo /quote para não deixar o usuário no vazio.
  if (out.length === 0 && isB3Pattern) {
    try {
      const sym = `${trimmed}${B3_SUFFIX}`;
      const q = (await yahooFinance.quote(sym)) as RawQuote;
      out.push({
        ticker: sym,
        displayTicker: trimmed,
        name: q.longName ?? q.shortName ?? trimmed,
        assetClass: "stock_br",
        exchange: q.fullExchangeName,
      });
    } catch {
      // ticker inexistente — devolvemos lista vazia
    }
  }

  // Match exato no topo, mesmo quando o Yahoo devolve vários "PETR" antes.
  out.sort((a, b) => {
    const aExact = a.displayTicker === trimmed ? 0 : 1;
    const bExact = b.displayTicker === trimmed ? 0 : 1;
    return aExact - bExact;
  });

  return out;
}

type RawSummary = {
  price?: {
    regularMarketPrice?: number | { raw?: number };
    longName?: string;
    shortName?: string;
    currency?: string;
    exchangeName?: string;
    marketCap?: number | { raw?: number };
    averageDailyVolume3Month?: number | { raw?: number };
  };
  summaryDetail?: {
    trailingPE?: number | { raw?: number };
    forwardPE?: number | { raw?: number };
    dividendYield?: number | { raw?: number };
    beta?: number | { raw?: number };
    fiftyTwoWeekLow?: number | { raw?: number };
    fiftyTwoWeekHigh?: number | { raw?: number };
    averageVolume?: number | { raw?: number };
  };
  defaultKeyStatistics?: {
    trailingEps?: number | { raw?: number };
    priceToBook?: number | { raw?: number };
    "52WeekChange"?: number | { raw?: number };
    ytdReturn?: number | { raw?: number };
  };
  summaryProfile?: {
    sector?: string;
    industry?: string;
    country?: string;
    website?: string;
    longBusinessSummary?: string;
  };
  financialData?: {
    profitMargins?: number | { raw?: number };
    returnOnEquity?: number | { raw?: number };
    totalRevenue?: number | { raw?: number };
  };
};

function num(v: number | { raw?: number } | undefined): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (v && typeof v.raw === "number") return v.raw;
  return undefined;
}

export async function getAssetSummary(input: string): Promise<AssetSummary> {
  const { yahooSymbol, displayTicker, assetClass } = normalizeTicker(input);
  const s = (await yahooFinance.quoteSummary(yahooSymbol, {
    modules: [
      "price",
      "summaryDetail",
      "defaultKeyStatistics",
      "summaryProfile",
      "financialData",
    ],
  })) as RawSummary;

  const p = s.price ?? {};
  const sd = s.summaryDetail ?? {};
  const ks = s.defaultKeyStatistics ?? {};
  const sp = s.summaryProfile ?? {};
  const fd = s.financialData ?? {};

  return {
    ticker: yahooSymbol,
    displayTicker,
    name: p.longName ?? p.shortName ?? displayTicker,
    longName: p.longName,
    currency: p.currency ?? (assetClass === "stock_br" ? "BRL" : "USD"),
    exchange: p.exchangeName,
    sector: sp.sector,
    industry: sp.industry,
    country: sp.country,
    website: sp.website,
    longBusinessSummary: sp.longBusinessSummary,
    marketCap: num(p.marketCap),
    trailingPE: num(sd.trailingPE),
    forwardPE: num(sd.forwardPE),
    priceToBook: num(ks.priceToBook),
    trailingEps: num(ks.trailingEps),
    dividendYield: num(sd.dividendYield),
    beta: num(sd.beta),
    fiftyTwoWeekLow: num(sd.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: num(sd.fiftyTwoWeekHigh),
    fiftyTwoWeekChangePercent: num(ks["52WeekChange"]),
    ytdReturn: num(ks.ytdReturn),
    averageVolume: num(sd.averageVolume) ?? num(p.averageDailyVolume3Month),
    profitMargins: num(fd.profitMargins),
    returnOnEquity: num(fd.returnOnEquity),
    totalRevenue: num(fd.totalRevenue),
  };
}

// --- Fundamentos profundos (Sprint v1.2-B) -------------------------------
// Estes módulos do quoteSummary não vêm para todo ticker — empresas
// brasileiras geralmente só preenchem income/balance/cashflow anuais. Por
// isso cada array pode vir vazio sem o caller quebrar.

type RawStatementRow = {
  endDate?: number | Date | { raw?: number; fmt?: string };
  totalRevenue?: number | { raw?: number };
  grossProfit?: number | { raw?: number };
  operatingIncome?: number | { raw?: number };
  ebitda?: number | { raw?: number };
  netIncome?: number | { raw?: number };
};

type RawBalanceRow = {
  endDate?: number | Date | { raw?: number; fmt?: string };
  totalAssets?: number | { raw?: number };
  totalLiab?: number | { raw?: number };
  totalStockholderEquity?: number | { raw?: number };
  cash?: number | { raw?: number };
  shortLongTermDebt?: number | { raw?: number };
  longTermDebt?: number | { raw?: number };
};

type RawCashflowRow = {
  endDate?: number | Date | { raw?: number; fmt?: string };
  totalCashFromOperatingActivities?: number | { raw?: number };
  capitalExpenditures?: number | { raw?: number };
  dividendsPaid?: number | { raw?: number };
};

type RawRecommendationRow = {
  period?: string;
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
};

type RawUpgradeRow = {
  epochGradeDate?: number | Date | { raw?: number };
  firm?: string;
  fromGrade?: string;
  toGrade?: string;
  action?: string;
};

type RawFundamentals = {
  price?: { marketCap?: number | { raw?: number } };
  incomeStatementHistory?: { incomeStatementHistory?: RawStatementRow[] };
  balanceSheetHistory?: { balanceSheetStatements?: RawBalanceRow[] };
  cashflowStatementHistory?: { cashflowStatements?: RawCashflowRow[] };
  recommendationTrend?: { trend?: RawRecommendationRow[] };
  upgradeDowngradeHistory?: { history?: RawUpgradeRow[] };
};

function dateString(
  v: number | Date | { raw?: number; fmt?: string } | undefined
): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return new Date(v * 1000).toISOString().slice(0, 10);
  if (typeof v === "object") {
    if (typeof v.fmt === "string") return v.fmt;
    if (typeof v.raw === "number")
      return new Date(v.raw * 1000).toISOString().slice(0, 10);
  }
  return "";
}

const fundamentalsCache = new Map<
  string,
  { value: AssetFundamentals; fetchedAt: number }
>();
const FUND_TTL = 60 * 60 * 1000;

export async function getAssetFundamentals(
  input: string
): Promise<AssetFundamentals> {
  const { yahooSymbol } = normalizeTicker(input);
  const now = Date.now();
  const cached = fundamentalsCache.get(yahooSymbol);
  if (cached && now - cached.fetchedAt < FUND_TTL) return cached.value;

  const raw = (await yahooFinance.quoteSummary(yahooSymbol, {
    modules: [
      "price",
      "incomeStatementHistory",
      "balanceSheetHistory",
      "cashflowStatementHistory",
      "recommendationTrend",
      "upgradeDowngradeHistory",
    ],
  })) as RawFundamentals;

  const income: IncomeStatementYear[] = (
    raw.incomeStatementHistory?.incomeStatementHistory ?? []
  ).map((r) => ({
    endDate: dateString(r.endDate),
    totalRevenue: num(r.totalRevenue),
    grossProfit: num(r.grossProfit),
    operatingIncome: num(r.operatingIncome),
    ebitda: num(r.ebitda),
    netIncome: num(r.netIncome),
  }));

  const balance: BalanceSheetYear[] = (
    raw.balanceSheetHistory?.balanceSheetStatements ?? []
  ).map((r) => {
    const short = num(r.shortLongTermDebt) ?? 0;
    const long = num(r.longTermDebt) ?? 0;
    const totalDebt = short + long > 0 ? short + long : undefined;
    return {
      endDate: dateString(r.endDate),
      totalAssets: num(r.totalAssets),
      totalLiabilities: num(r.totalLiab),
      totalEquity: num(r.totalStockholderEquity),
      totalCash: num(r.cash),
      totalDebt,
    };
  });

  const cashflow: CashflowYear[] = (
    raw.cashflowStatementHistory?.cashflowStatements ?? []
  ).map((r) => {
    const op = num(r.totalCashFromOperatingActivities);
    const capex = num(r.capitalExpenditures);
    const fcf =
      op !== undefined && capex !== undefined ? op + capex : undefined;
    return {
      endDate: dateString(r.endDate),
      operatingCashflow: op,
      capitalExpenditures: capex,
      freeCashflow: fcf,
      dividendsPaid: num(r.dividendsPaid),
    };
  });

  const recommendations: RecommendationTrend[] = (
    raw.recommendationTrend?.trend ?? []
  ).map((r) => ({
    period: r.period ?? "",
    strongBuy: r.strongBuy ?? 0,
    buy: r.buy ?? 0,
    hold: r.hold ?? 0,
    sell: r.sell ?? 0,
    strongSell: r.strongSell ?? 0,
  }));

  const upgrades: UpgradeDowngrade[] = (
    raw.upgradeDowngradeHistory?.history ?? []
  )
    .slice(0, 15)
    .map((r) => ({
      date: dateString(r.epochGradeDate),
      firm: r.firm ?? "—",
      fromGrade: r.fromGrade,
      toGrade: r.toGrade,
      action: r.action,
    }));

  const derived = deriveMultiples({
    marketCap: num(raw.price?.marketCap),
    latestIncome: income[0],
    latestBalance: balance[0],
    latestCashflow: cashflow[0],
  });

  const value: AssetFundamentals = {
    income,
    balance,
    cashflow,
    recommendations,
    upgrades,
    derived,
  };
  fundamentalsCache.set(yahooSymbol, { value, fetchedAt: now });
  return value;
}

// Múltiplos derivados explícitos para o caller não recalcular. Mantemos
// puro (sem leitura de API) para ficar testável.
export function deriveMultiples(input: {
  marketCap?: number;
  latestIncome?: IncomeStatementYear;
  latestBalance?: BalanceSheetYear;
  latestCashflow?: CashflowYear;
}): AssetFundamentals["derived"] {
  const { marketCap, latestIncome, latestBalance, latestCashflow } = input;
  const derived: AssetFundamentals["derived"] = {};

  const ebitda = latestIncome?.ebitda;
  const cash = latestBalance?.totalCash;
  const debt = latestBalance?.totalDebt;

  if (
    marketCap !== undefined &&
    ebitda !== undefined &&
    ebitda !== 0
  ) {
    const ev = marketCap + (debt ?? 0) - (cash ?? 0);
    derived.evEbitda = ev / ebitda;
  }

  if (
    ebitda !== undefined &&
    ebitda !== 0 &&
    (debt !== undefined || cash !== undefined)
  ) {
    const netDebt = (debt ?? 0) - (cash ?? 0);
    derived.netDebtToEbitda = netDebt / ebitda;
  }

  if (latestIncome?.netIncome && latestCashflow?.dividendsPaid) {
    // dividendsPaid no Yahoo vem negativo (saída de caixa). Pegamos o módulo.
    const div = Math.abs(latestCashflow.dividendsPaid);
    if (latestIncome.netIncome > 0) {
      derived.payoutRatio = div / latestIncome.netIncome;
    }
  }

  if (
    latestIncome?.grossProfit !== undefined &&
    latestIncome.totalRevenue
  ) {
    derived.grossMargin =
      latestIncome.grossProfit / latestIncome.totalRevenue;
  }
  if (
    latestIncome?.operatingIncome !== undefined &&
    latestIncome.totalRevenue
  ) {
    derived.operatingMargin =
      latestIncome.operatingIncome / latestIncome.totalRevenue;
  }

  return derived;
}

// --- Peers (Sprint v1.2-B) ----------------------------------------------

export async function getPeerQuotes(
  symbols: string[]
): Promise<PeerQuote[]> {
  if (symbols.length === 0) return [];
  const out: PeerQuote[] = [];
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const { yahooSymbol, displayTicker, assetClass } = normalizeTicker(sym);
        const q = (await yahooFinance.quote(yahooSymbol)) as RawQuote & {
          marketCap?: number;
          trailingPE?: number;
          fiftyTwoWeekChange?: number;
          fiftyTwoWeekChangePercent?: number;
        };
        const price = q.regularMarketPrice ?? 0;
        const previousClose = q.regularMarketPreviousClose ?? price;
        const changePercent =
          previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;
        out.push({
          ticker: yahooSymbol,
          displayTicker,
          name: q.longName ?? q.shortName ?? displayTicker,
          price,
          changePercent,
          marketCap: q.marketCap,
          trailingPE: q.trailingPE,
          fiftyTwoWeekChangePercent:
            q.fiftyTwoWeekChangePercent ?? q.fiftyTwoWeekChange,
          currency: q.currency ?? (assetClass === "stock_br" ? "BRL" : "USD"),
        });
      } catch {
        // peer indisponível — ignora silenciosamente, lista é heurística
      }
    })
  );
  return out;
}
