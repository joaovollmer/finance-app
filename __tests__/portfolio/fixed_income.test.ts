import { describe, expect, it } from "vitest";
import {
  describeFixedIncome,
  valueFixedIncome,
} from "@/lib/portfolio/fixed_income";

// Helpers para datas determinísticas: "X anos atrás" e "Y meses atrás".
function yearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

describe("valueFixedIncome — pós-fixados", () => {
  it("CDB 100% CDI cresce ~CDI ao ano", () => {
    const r = valueFixedIncome({
      indexer: "cdi",
      indexPercent: 100,
      fixedRate: null,
      principal: 1000,
      purchaseDate: yearsAgo(1),
      rates: { cdiAnnual: 14.4 },
    });
    expect(r.effectiveRate).toBe(14.4);
    expect(r.currentValue).toBeCloseTo(1144, 0); // tolerância ~R$1
    expect(r.pnlPercent).toBeCloseTo(14.4, 1);
  });

  it("CDB 110% CDI rende 110% da taxa do CDI", () => {
    const r = valueFixedIncome({
      indexer: "cdi",
      indexPercent: 110,
      fixedRate: null,
      principal: 1000,
      purchaseDate: yearsAgo(1),
      rates: { cdiAnnual: 10 },
    });
    expect(r.effectiveRate).toBe(11);
    expect(r.currentValue).toBeCloseTo(1110, 0);
  });

  it("Tesouro Selic 100% rende a Selic", () => {
    const r = valueFixedIncome({
      indexer: "selic",
      indexPercent: 100,
      fixedRate: null,
      principal: 5000,
      purchaseDate: yearsAgo(2),
      rates: { selicAnnual: 14.5 },
    });
    expect(r.effectiveRate).toBe(14.5);
    // 5000 * 1.145^2 ≈ 6555 — tolerância maior (dia juliano) para
    // absorver a diferença de 365.25 d.u. usada na função.
    expect(r.currentValue).toBeGreaterThan(6500);
    expect(r.currentValue).toBeLessThan(6620);
  });
});

describe("valueFixedIncome — IPCA+ e prefixado", () => {
  it("IPCA+6% acumula IPCA + 6 ao ano", () => {
    const r = valueFixedIncome({
      indexer: "ipca",
      indexPercent: null,
      fixedRate: 6,
      principal: 1000,
      purchaseDate: yearsAgo(1),
      rates: { ipcaAnnual: 4 },
    });
    expect(r.effectiveRate).toBe(10);
    expect(r.currentValue).toBeCloseTo(1100, 0);
  });

  it("Prefixado trava a taxa contratada, ignora rates atuais", () => {
    const r = valueFixedIncome({
      indexer: "prefixed",
      indexPercent: null,
      fixedRate: 11,
      principal: 1000,
      purchaseDate: yearsAgo(1),
      rates: { selicAnnual: 50, cdiAnnual: 50, ipcaAnnual: 50 },
    });
    expect(r.effectiveRate).toBe(11);
    expect(r.currentValue).toBeCloseTo(1110, 0);
  });

  it("Treasury usa a taxa contratada", () => {
    const r = valueFixedIncome({
      indexer: "treasury",
      indexPercent: null,
      fixedRate: 4.5,
      principal: 10000,
      purchaseDate: yearsAgo(2),
      rates: {},
    });
    expect(r.effectiveRate).toBe(4.5);
    expect(r.currentValue).toBeCloseTo(10000 * Math.pow(1.045, 2), 0);
  });
});

describe("valueFixedIncome — bordas", () => {
  it("compra de hoje devolve principal sem rendimento", () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = valueFixedIncome({
      indexer: "cdi",
      indexPercent: 100,
      fixedRate: null,
      principal: 1000,
      purchaseDate: today,
      rates: { cdiAnnual: 14.4 },
    });
    expect(r.yearsElapsed).toBeLessThan(0.01);
    expect(r.currentValue).toBeCloseTo(1000, 0);
    expect(r.pnlAbsolute).toBeCloseTo(0, 0);
  });

  it("rates faltando viram taxa zero (não NaN)", () => {
    const r = valueFixedIncome({
      indexer: "cdi",
      indexPercent: 100,
      fixedRate: null,
      principal: 1000,
      purchaseDate: yearsAgo(1),
      rates: {},
    });
    expect(r.effectiveRate).toBe(0);
    expect(r.currentValue).toBe(1000);
  });
});

describe("describeFixedIncome", () => {
  it("descreve cada classe com a unidade correta", () => {
    expect(describeFixedIncome("cdi", 110, null)).toBe("110% CDI");
    expect(describeFixedIncome("selic", null, null)).toBe("100% Selic");
    expect(describeFixedIncome("ipca", null, 6)).toBe("IPCA + 6.00% a.a.");
    expect(describeFixedIncome("prefixed", null, 11.25)).toBe(
      "Prefixado 11.25% a.a."
    );
    expect(describeFixedIncome("treasury", null, 4.5)).toBe(
      "Treasury 4.50% a.a."
    );
  });
});
