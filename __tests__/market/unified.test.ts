import { describe, expect, it } from "vitest";
import {
  buildUnifiedFundamentals,
  mergeRecommendations,
  newsSearchUrl,
} from "@/lib/market/unified";
import type {
  AssetSummary,
  AssetFundamentals,
  RecommendationTrend,
} from "@/lib/market/types";
import type {
  FinnhubMetrics,
  FinnhubRecommendation,
} from "@/lib/market/finnhub";

const emptyFundamentals: AssetFundamentals = {
  income: [],
  balance: [],
  cashflow: [],
  recommendations: [],
  upgrades: [],
  derived: {},
};

const baseInput = {
  ticker: "AAPL",
  displayTicker: "AAPL",
  currency: "USD",
  summary: null as AssetSummary | null,
  fundamentals: null as AssetFundamentals | null,
  metrics: null as FinnhubMetrics | null,
  profile: null,
  finnhubRecommendations: [] as FinnhubRecommendation[],
  priceTarget: null,
  earnings: [],
};

describe("buildUnifiedFundamentals — fallbacks", () => {
  it("usa Yahoo quando ambas as fontes têm o dado", () => {
    const r = buildUnifiedFundamentals({
      ...baseInput,
      summary: { ticker: "AAPL", displayTicker: "AAPL", name: "Apple", currency: "USD", trailingPE: 28 },
      metrics: { trailingPE: 30 },
    });
    expect(r.trailingPE?.value).toBe(28);
    expect(r.trailingPE?.source).toBe("yahoo");
  });

  it("cai para Finnhub quando Yahoo não tem", () => {
    const r = buildUnifiedFundamentals({
      ...baseInput,
      summary: { ticker: "AAPL", displayTicker: "AAPL", name: "Apple", currency: "USD" },
      metrics: { roe: 0.32 },
    });
    expect(r.returnOnEquity?.value).toBe(0.32);
    expect(r.returnOnEquity?.source).toBe("finnhub");
  });

  it("calcula margem bruta via DRE quando nem Yahoo nem Finnhub a expõem", () => {
    const r = buildUnifiedFundamentals({
      ...baseInput,
      summary: { ticker: "AAPL", displayTicker: "AAPL", name: "Apple", currency: "USD" },
      fundamentals: {
        ...emptyFundamentals,
        income: [
          {
            endDate: "2025-12-31",
            totalRevenue: 1000,
            grossProfit: 420,
            operatingIncome: 250,
            ebitda: 300,
            netIncome: 200,
          },
        ],
      },
    });
    expect(r.grossMargin?.value).toBeCloseTo(0.42, 4);
    expect(r.grossMargin?.source).toBe("calculated");
    expect(r.grossMargin?.formula).toContain("lucro bruto");
  });

  it("calcula crescimento receita YoY com DRE de 2 anos", () => {
    const r = buildUnifiedFundamentals({
      ...baseInput,
      summary: { ticker: "AAPL", displayTicker: "AAPL", name: "Apple", currency: "USD" },
      fundamentals: {
        ...emptyFundamentals,
        income: [
          { endDate: "2025-12-31", totalRevenue: 1200 },
          { endDate: "2024-12-31", totalRevenue: 1000 },
        ],
      },
    });
    expect(r.revenueGrowthYoy?.value).toBeCloseTo(0.2, 4);
    expect(r.revenueGrowthYoy?.source).toBe("calculated");
  });

  it("calcula EV/EBITDA manualmente quando derived não traz", () => {
    const r = buildUnifiedFundamentals({
      ...baseInput,
      summary: {
        ticker: "AAPL",
        displayTicker: "AAPL",
        name: "Apple",
        currency: "USD",
        marketCap: 100_000,
      },
      fundamentals: {
        ...emptyFundamentals,
        income: [{ endDate: "2025-12-31", ebitda: 10_000 }],
        balance: [
          {
            endDate: "2025-12-31",
            totalDebt: 20_000,
            totalCash: 5_000,
          },
        ],
      },
    });
    // EV = 100k + 20k - 5k = 115k; EV/EBITDA = 11.5
    expect(r.evEbitda?.value).toBeCloseTo(11.5, 4);
    expect(r.evEbitda?.source).toBe("calculated");
  });

  it("devolve undefined quando não há fonte nem dados para calcular", () => {
    const r = buildUnifiedFundamentals(baseInput);
    expect(r.grossMargin).toBeUndefined();
    expect(r.evEbitda).toBeUndefined();
    expect(r.returnOnEquity).toBeUndefined();
  });
});

describe("mergeRecommendations", () => {
  const yahoo: RecommendationTrend[] = [
    { period: "0m", strongBuy: 8, buy: 12, hold: 5, sell: 1, strongSell: 0 },
  ];
  const finnhub: FinnhubRecommendation[] = [
    {
      period: "2026-05-01",
      strongBuy: 5,
      buy: 7,
      hold: 3,
      sell: 0,
      strongSell: 0,
    },
  ];

  it("retorna null quando ambas as fontes estão vazias", () => {
    expect(mergeRecommendations([], [])).toBeNull();
  });

  it("usa Yahoo quando só Yahoo tem dado", () => {
    const r = mergeRecommendations(yahoo, []);
    expect(r?.source).toBe("yahoo");
    expect(r?.total).toBe(26);
  });

  it("usa Finnhub quando só Finnhub tem dado", () => {
    const r = mergeRecommendations([], finnhub);
    expect(r?.source).toBe("finnhub");
    expect(r?.total).toBe(15);
  });

  it("soma quando ambas têm — flag 'merged'", () => {
    const r = mergeRecommendations(yahoo, finnhub);
    expect(r?.source).toBe("merged");
    expect(r?.strongBuy).toBe(13);
    expect(r?.buy).toBe(19);
    expect(r?.total).toBe(41);
  });
});

describe("newsSearchUrl", () => {
  it("monta URL do Google News com casa + ticker", () => {
    const url = newsSearchUrl("Goldman Sachs", "AAPL");
    expect(url).toContain("news.google.com/search?q=");
    expect(decodeURIComponent(url)).toContain("Goldman Sachs AAPL");
  });
});
