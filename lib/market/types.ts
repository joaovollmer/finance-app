export type AssetClass = "stock_br" | "stock_us" | "bond_br" | "bond_us";

export type FixedIncomeIndexer =
  | "selic"
  | "cdi"
  | "ipca"
  | "prefixed"
  | "treasury";

export interface FixedIncomeHolding {
  ticker: string;
  assetClass: "bond_br" | "bond_us";
  indexer: FixedIncomeIndexer;
  indexPercent: number | null;
  fixedRate: number | null;
  purchaseDate: string;
  maturityDate: string | null;
  principal: number;
}

export type HistoryRange = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y";

export interface Quote {
  ticker: string;
  displayTicker: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  marketState?: string;
  exchange?: string;
}

export interface Candle {
  date: string;
  close: number;
}

export interface AssetSearchResult {
  ticker: string;
  displayTicker: string;
  name: string;
  assetClass: AssetClass;
  exchange?: string;
}

export interface AssetSummary {
  ticker: string;
  displayTicker: string;
  name: string;
  longName?: string;
  currency: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  country?: string;
  website?: string;
  longBusinessSummary?: string;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  trailingEps?: number;
  dividendYield?: number;
  beta?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekChangePercent?: number;
  ytdReturn?: number;
  averageVolume?: number;
  profitMargins?: number;
  returnOnEquity?: number;
  totalRevenue?: number;
}

// Fundamentos profundos (Sprint v1.2-B). Carregados sob demanda além do
// AssetSummary porque exigem mais módulos do quoteSummary.

export interface IncomeStatementYear {
  endDate: string;
  totalRevenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  ebitda?: number;
  netIncome?: number;
}

export interface BalanceSheetYear {
  endDate: string;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  totalCash?: number;
  totalDebt?: number;
}

export interface CashflowYear {
  endDate: string;
  operatingCashflow?: number;
  capitalExpenditures?: number;
  freeCashflow?: number;
  dividendsPaid?: number;
}

export interface RecommendationTrend {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface UpgradeDowngrade {
  date: string;
  firm: string;
  fromGrade?: string;
  toGrade?: string;
  action?: string;
}

export interface AssetFundamentals {
  income: IncomeStatementYear[];
  balance: BalanceSheetYear[];
  cashflow: CashflowYear[];
  recommendations: RecommendationTrend[];
  upgrades: UpgradeDowngrade[];
  // Múltiplos derivados a partir dos demonstrativos + market cap.
  derived: {
    evEbitda?: number;
    netDebtToEbitda?: number;
    payoutRatio?: number;
    grossMargin?: number;
    operatingMargin?: number;
  };
}

export interface PeerQuote {
  ticker: string;
  displayTicker: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap?: number;
  trailingPE?: number;
  fiftyTwoWeekChangePercent?: number;
  currency: string;
}


