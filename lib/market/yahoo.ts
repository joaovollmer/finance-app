import yahooFinance from "yahoo-finance2";
import type {
  AssetClass,
  AssetSearchResult,
  Candle,
  HistoryRange,
  Quote,
} from "./types";

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
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const r = (await yahooFinance.search(trimmed, {
    quotesCount: 10,
    newsCount: 0,
  })) as { quotes?: RawSearchQuote[] };
  const out: AssetSearchResult[] = [];

  for (const item of r.quotes ?? []) {
    if (!item.symbol) continue;
    const { symbol, exchange, quoteType } = item;
    if (quoteType !== "EQUITY" && quoteType !== "ETF") continue;

    const isB3 = symbol.endsWith(B3_SUFFIX);
    const isUS =
      exchange === "NMS" || exchange === "NYQ" || exchange === "NGM" ||
      exchange === "ASE" || exchange === "PCX";
    if (!isB3 && !isUS) continue;

    out.push({
      ticker: symbol,
      displayTicker: isB3 ? symbol.slice(0, -B3_SUFFIX.length) : symbol,
      name: item.longname ?? item.shortname ?? symbol,
      assetClass: isB3 ? "stock_br" : "stock_us",
      exchange,
    });
  }

  return out;
}
