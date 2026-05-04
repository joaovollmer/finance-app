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

