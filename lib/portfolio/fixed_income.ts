// Marcação a mercado simplificada de títulos de renda fixa.
//
// Modelagem MVP: ignoramos curva de juros e marcação intraday. Calculamos só
// o "valor acumulado" pela taxa equivalente desde a compra:
//   - pós-fixado: taxa atual do indexador * indexPercent (ex.: 100% CDI)
//   - prefixado: taxa contratada (fixedRate)
//   - IPCA+: taxa do IPCA + spread (fixedRate)
//   - treasury: yield contratado (fixedRate) ou yield atual da curva
//
// É bom o suficiente para um simulador educacional. Para precificação real
// precisaríamos da curva de juros e descontar o fluxo até o vencimento.

import type { FixedIncomeIndexer } from "@/lib/market/types";

export interface RateSnapshot {
  selicAnnual?: number;
  cdiAnnual?: number;
  ipcaAnnual?: number;
}

export interface FixedIncomeValuationInput {
  indexer: FixedIncomeIndexer;
  indexPercent: number | null;
  fixedRate: number | null;
  principal: number;
  purchaseDate: string;
  rates: RateSnapshot;
}

export interface FixedIncomeValuation {
  currentValue: number;
  pnlAbsolute: number;
  pnlPercent: number;
  effectiveRate: number; // % a.a. usada
  yearsElapsed: number;
}

export function valueFixedIncome(
  input: FixedIncomeValuationInput
): FixedIncomeValuation {
  const { indexer, indexPercent, fixedRate, principal, purchaseDate, rates } =
    input;

  const start = new Date(purchaseDate + "T00:00:00");
  const yearsElapsed = Math.max(
    0,
    (Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000)
  );

  const effectiveRate = resolveEffectiveRate(
    indexer,
    indexPercent,
    fixedRate,
    rates
  );

  const factor = Math.pow(1 + effectiveRate / 100, yearsElapsed);
  const currentValue = principal * factor;
  const pnlAbsolute = currentValue - principal;
  const pnlPercent = (factor - 1) * 100;

  return {
    currentValue,
    pnlAbsolute,
    pnlPercent,
    effectiveRate,
    yearsElapsed,
  };
}

function resolveEffectiveRate(
  indexer: FixedIncomeIndexer,
  indexPercent: number | null,
  fixedRate: number | null,
  rates: RateSnapshot
): number {
  switch (indexer) {
    case "selic": {
      const base = rates.selicAnnual ?? 0;
      const pct = indexPercent ?? 100;
      return base * (pct / 100);
    }
    case "cdi": {
      const base = rates.cdiAnnual ?? 0;
      const pct = indexPercent ?? 100;
      return base * (pct / 100);
    }
    case "ipca": {
      const ipca = rates.ipcaAnnual ?? 0;
      const spread = fixedRate ?? 0;
      return ipca + spread;
    }
    case "prefixed":
    case "treasury":
      return fixedRate ?? 0;
  }
}

export function describeFixedIncome(
  indexer: FixedIncomeIndexer,
  indexPercent: number | null,
  fixedRate: number | null
): string {
  switch (indexer) {
    case "selic":
      return `${indexPercent ?? 100}% Selic`;
    case "cdi":
      return `${indexPercent ?? 100}% CDI`;
    case "ipca":
      return `IPCA + ${(fixedRate ?? 0).toFixed(2)}% a.a.`;
    case "prefixed":
      return `Prefixado ${(fixedRate ?? 0).toFixed(2)}% a.a.`;
    case "treasury":
      return `Treasury ${(fixedRate ?? 0).toFixed(2)}% a.a.`;
  }
}
