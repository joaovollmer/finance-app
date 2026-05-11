import { describe, expect, it } from "vitest";
import { deriveMultiples } from "@/lib/market/yahoo";
import { resolvePeers } from "@/lib/market/peers";

describe("deriveMultiples", () => {
  it("calcula EV/EBITDA com dívida e caixa", () => {
    const r = deriveMultiples({
      marketCap: 100_000,
      latestIncome: {
        endDate: "2025-12-31",
        ebitda: 10_000,
      },
      latestBalance: {
        endDate: "2025-12-31",
        totalDebt: 20_000,
        totalCash: 5_000,
      },
    });
    // EV = 100k + 20k - 5k = 115k; EV/EBITDA = 11.5
    expect(r.evEbitda).toBeCloseTo(11.5, 4);
  });

  it("calcula dívida líquida / EBITDA", () => {
    const r = deriveMultiples({
      marketCap: 1000,
      latestIncome: { endDate: "2025-12-31", ebitda: 100 },
      latestBalance: { endDate: "2025-12-31", totalDebt: 300, totalCash: 50 },
    });
    // netDebt = 300 - 50 = 250; 250/100 = 2.5
    expect(r.netDebtToEbitda).toBeCloseTo(2.5, 4);
  });

  it("payout usa módulo de dividendsPaid (Yahoo manda negativo)", () => {
    const r = deriveMultiples({
      marketCap: 0,
      latestIncome: { endDate: "2025-12-31", netIncome: 1000 },
      latestBalance: { endDate: "2025-12-31" },
      latestCashflow: { endDate: "2025-12-31", dividendsPaid: -400 },
    });
    expect(r.payoutRatio).toBeCloseTo(0.4, 4);
  });

  it("margens (bruta e operacional) sobre receita", () => {
    const r = deriveMultiples({
      latestIncome: {
        endDate: "2025-12-31",
        totalRevenue: 1000,
        grossProfit: 400,
        operatingIncome: 250,
      },
      latestBalance: { endDate: "2025-12-31" },
    });
    expect(r.grossMargin).toBeCloseTo(0.4, 4);
    expect(r.operatingMargin).toBeCloseTo(0.25, 4);
  });

  it("não calcula EV/EBITDA quando EBITDA é zero", () => {
    const r = deriveMultiples({
      marketCap: 100,
      latestIncome: { endDate: "2025-12-31", ebitda: 0 },
      latestBalance: { endDate: "2025-12-31" },
    });
    expect(r.evEbitda).toBeUndefined();
  });

  it("ignora payout se lucro líquido for zero ou negativo", () => {
    const r = deriveMultiples({
      latestIncome: { endDate: "2025-12-31", netIncome: -200 },
      latestBalance: { endDate: "2025-12-31" },
      latestCashflow: { endDate: "2025-12-31", dividendsPaid: -100 },
    });
    expect(r.payoutRatio).toBeUndefined();
  });
});

describe("resolvePeers", () => {
  it("resolve peers de banco (BR)", () => {
    const peers = resolvePeers({
      ticker: "ITUB4.SA",
      industry: "Banks—Regional",
      isB3: true,
    });
    expect(peers).toContain("BBDC4.SA");
    expect(peers).not.toContain("ITUB4.SA");
    expect(peers.length).toBeLessThanOrEqual(5);
  });

  it("resolve peers de tech US por industry", () => {
    const peers = resolvePeers({
      ticker: "MSFT",
      industry: "Software—Infrastructure",
      isB3: false,
    });
    expect(peers).toContain("ORCL");
    expect(peers).not.toContain("MSFT");
  });

  it("cai no sector quando industry não bate", () => {
    const peers = resolvePeers({
      ticker: "PETR4.SA",
      sector: "Energy",
      industry: "industria-nao-mapeada",
      isB3: true,
    });
    expect(peers).toContain("PRIO3.SA");
  });

  it("devolve lista vazia quando sector e industry não casam", () => {
    expect(
      resolvePeers({
        ticker: "XXXX.SA",
        sector: "industria-aleatoria",
        industry: "outro-setor",
        isB3: true,
      })
    ).toEqual([]);
  });
});
