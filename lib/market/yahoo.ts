import yfDefault from "yahoo-finance2";
import type {
  AssetClass,
  AssetSearchResult,
  AssetSummary,
  Candle,
  HistoryRange,
  Quote,
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
