import { describe, expect, it } from "vitest";
import { mapMetrics } from "@/lib/market/finnhub";
import {
  extractFinnhubExtras,
  mergeQuote,
  mergeSummary,
} from "@/lib/market/aggregate";
import type { Quote, AssetSummary } from "@/lib/market/types";
import type { FinnhubQuote, FinnhubMetrics } from "@/lib/market/finnhub";

describe("mapMetrics", () => {
  it("converte percentuais Finnhub (4.2) em fração (0.042)", () => {
    const r = mapMetrics({
      grossMarginTTM: 42.5,
      netProfitMarginTTM: 10,
      roeTTM: 25,
      dividendYieldIndicatedAnnual: 3.5,
    });
    expect(r.grossMargin).toBeCloseTo(0.425, 4);
    expect(r.netMargin).toBeCloseTo(0.1, 4);
    expect(r.roe).toBeCloseTo(0.25, 4);
    expect(r.dividendYield).toBeCloseTo(0.035, 4);
  });

  it("marketCap em milhões USD é convertido para unidade", () => {
    const r = mapMetrics({ marketCapitalization: 2500 });
    // 2500 milhões = 2,5 bi
    expect(r.marketCap).toBe(2_500_000_000);
  });

  it("prefere TTM (mais recente) sobre Annual quando ambos existem", () => {
    const r = mapMetrics({
      grossMarginTTM: 42,
      grossMarginAnnual: 39,
      peExclExtraTTM: 28,
      peAnnual: 31,
    });
    expect(r.grossMargin).toBeCloseTo(0.42, 4);
    expect(r.trailingPE).toBe(28);
  });

  it("retorna {} para métrica vazia", () => {
    expect(mapMetrics({})).toEqual({});
  });
});

describe("mergeQuote", () => {
  const yahoo: Quote = {
    ticker: "AAPL",
    displayTicker: "AAPL",
    name: "Apple Inc.",
    assetClass: "stock_us",
    currency: "USD",
    price: 200,
    previousClose: 198,
    change: 2,
    changePercent: 1.01,
  };

  it("sem Finnhub volta o Yahoo intocado", () => {
    expect(mergeQuote(yahoo, null)).toEqual(yahoo);
  });

  it("adiciona high/low/open quando Finnhub disponível", () => {
    const fh: FinnhubQuote = {
      c: 201,
      d: 3,
      dp: 1.5,
      h: 202,
      l: 197,
      o: 199,
      pc: 198,
      t: 0,
    };
    const merged = mergeQuote(yahoo, fh);
    expect(merged.price).toBe(200); // Yahoo é a fonte de verdade
    expect(merged.dayHigh).toBe(202);
    expect(merged.dayLow).toBe(197);
    expect(merged.dayOpen).toBe(199);
  });

  it("ignora high/low/open Finnhub quando vêm zerados", () => {
    const fh: FinnhubQuote = {
      c: 201,
      d: 0,
      dp: 0,
      h: 0,
      l: 0,
      o: 0,
      pc: 0,
      t: 0,
    };
    const merged = mergeQuote(yahoo, fh);
    expect(merged.dayHigh).toBeUndefined();
    expect(merged.dayLow).toBeUndefined();
    expect(merged.dayOpen).toBeUndefined();
  });
});

describe("mergeSummary", () => {
  const yahoo: AssetSummary = {
    ticker: "AAPL",
    displayTicker: "AAPL",
    name: "Apple",
    currency: "USD",
    trailingPE: 30,
    profitMargins: 0.25,
  };

  it("preserva Yahoo quando Finnhub não tem nada", () => {
    expect(mergeSummary(yahoo, null, null)).toEqual(yahoo);
  });

  it("Finnhub preenche lacunas mas não sobrescreve Yahoo", () => {
    const metrics: FinnhubMetrics = {
      trailingPE: 28,
      roe: 0.4,
      payoutRatio: 0.1,
    };
    const r = mergeSummary(yahoo, metrics, null);
    expect(r.trailingPE).toBe(30); // Yahoo permanece
    expect(r.returnOnEquity).toBe(0.4); // Finnhub preenche
  });

  it("usa Finnhub profile.industry quando Yahoo não traz", () => {
    const r = mergeSummary(yahoo, null, {
      finnhubIndustry: "Technology",
      country: "US",
    });
    expect(r.industry).toBe("Technology");
    expect(r.country).toBe("US");
  });
});

describe("extractFinnhubExtras", () => {
  it("extrai indicadores Finnhub-only", () => {
    const r = extractFinnhubExtras({
      payoutRatio: 0.15,
      grossMargin: 0.4,
      roa: 0.1,
      debtToEquity: 1.2,
      forwardPEG: 1.8,
    });
    expect(r.payoutRatio).toBe(0.15);
    expect(r.debtToEquity).toBe(1.2);
    expect(r.forwardPEG).toBe(1.8);
  });

  it("vazio quando Finnhub não está disponível", () => {
    expect(extractFinnhubExtras(null)).toEqual({});
  });
});
