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
  deposit_mode?: boolean;
  total_deposited?: number;
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

// Baseline para o cálculo de P&L do dashboard. Em modo padrão usamos o saldo
// inicial; em deposit-on-buy usamos o total aportado (que cresce a cada
// compra que precisa de aporte novo). Quando o aporte é zero (carteira
// recém-criada em modo deposit), o percentual é 0 — o card mostra a
// orientação para a primeira compra.
export function portfolioBaseline(
  portfolio: Pick<
    PortfolioRow,
    "initial_cash" | "deposit_mode" | "total_deposited"
  >
): number {
  if (portfolio.deposit_mode) return Number(portfolio.total_deposited ?? 0);
  return Number(portfolio.initial_cash);
}

export function portfolioPnL(
  portfolio: Pick<
    PortfolioRow,
    "initial_cash" | "deposit_mode" | "total_deposited"
  >,
  totalValue: number
): { baseline: number; absolute: number; percent: number } {
  const baseline = portfolioBaseline(portfolio);
  const absolute = totalValue - baseline;
  const percent = baseline > 0 ? (absolute / baseline) * 100 : 0;
  return { baseline, absolute, percent };
}
