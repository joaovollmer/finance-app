export type AssetClass = "stock_br" | "stock_us";

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
