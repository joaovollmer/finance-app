import type { AssetClass, FixedIncomeIndexer } from "@/lib/market/types";

export interface HoldingRow {
  portfolio_id: string;
  ticker: string;
  asset_class: AssetClass;
  quantity: number;
  avg_price: number;
  // Campos de renda fixa (nullable, populados via migration 0003)
  indexer?: FixedIncomeIndexer | null;
  index_percent?: number | null;
  fixed_rate?: number | null;
  purchase_date?: string | null;
  maturity_date?: string | null;
  principal?: number | null;
}

export interface PortfolioRow {
  id: string;
  user_id: string;
  name: string;
  initial_cash: number;
  cash_balance: number;
  currency: string;
  created_at: string;
}

export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function pnl(
  quantity: number,
  avgPrice: number,
  currentPrice: number
): { absolute: number; percent: number } {
  const cost = quantity * avgPrice;
  const market = quantity * currentPrice;
  const absolute = market - cost;
  const percent = cost > 0 ? (absolute / cost) * 100 : 0;
  return { absolute, percent };
}
