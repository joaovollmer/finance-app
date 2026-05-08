import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuote } from "@/lib/market/yahoo";
import { getUsdToBrl } from "@/lib/market/bcb";
import { getBrRates } from "@/lib/market/rates";
import { valueFixedIncome, type RateSnapshot } from "./fixed_income";
import type { HoldingRow, PortfolioRow } from "./valuation";

export interface PortfolioValuation {
  totalValue: number;
  positionsValue: number;
  stocksValue: number;
  bondsValue: number;
  cash: number;
  fxRate: number | null;
}

export async function computePortfolioValue(
  supabase: SupabaseClient,
  portfolio: PortfolioRow
): Promise<PortfolioValuation> {
  const { data: holdingsRaw } = await supabase
    .from("holdings")
    .select("*")
    .eq("portfolio_id", portfolio.id);

  const holdings = (holdingsRaw ?? []) as HoldingRow[];
  const stockHoldings = holdings.filter((h) => h.indexer == null);
  const bondHoldings = holdings.filter((h) => h.indexer != null);

  const enrichedStocks = await Promise.all(
    stockHoldings.map(async (h) => {
      try {
        const q = await getQuote(h.ticker);
        return { holding: h, quote: q };
      } catch {
        return { holding: h, quote: null };
      }
    })
  );

  let rateSnapshot: RateSnapshot = {};
  if (bondHoldings.length > 0) {
    const br = await getBrRates().catch(() => []);
    rateSnapshot = {
      selicAnnual: br.find((r) => r.code === "selic")?.ratePct,
      cdiAnnual: br.find((r) => r.code === "cdi")?.ratePct,
      ipcaAnnual: br.find((r) => r.code === "ipca")?.ratePct,
    };
  }

  const hasUsd =
    enrichedStocks.some(
      ({ holding, quote }) =>
        (quote?.currency ??
          (holding.asset_class === "stock_us" ? "USD" : "BRL")) !==
        portfolio.currency
    ) || bondHoldings.some((h) => h.asset_class === "bond_us");
  const fx = hasUsd ? await getUsdToBrl().catch(() => null) : null;
  const fxRate = fx?.rate ?? null;

  const stocksValue = enrichedStocks.reduce((acc, { holding, quote }) => {
    const price = quote?.price ?? Number(holding.avg_price);
    const ccy =
      quote?.currency ??
      (holding.asset_class === "stock_us" ? "USD" : "BRL");
    const native = holding.quantity * price;
    if (ccy === portfolio.currency) return acc + native;
    if (ccy === "USD" && portfolio.currency === "BRL" && fxRate) {
      return acc + native * fxRate;
    }
    return acc;
  }, 0);

  const bondsValue = bondHoldings.reduce((acc, h) => {
    const valuation = valueFixedIncome({
      indexer: h.indexer!,
      indexPercent: h.index_percent ?? null,
      fixedRate: h.fixed_rate ?? null,
      principal: Number(h.principal ?? h.avg_price),
      purchaseDate: h.purchase_date ?? new Date().toISOString().slice(0, 10),
      rates: rateSnapshot,
    });
    const ccy = h.asset_class === "bond_us" ? "USD" : "BRL";
    if (ccy === portfolio.currency) return acc + valuation.currentValue;
    if (ccy === "USD" && portfolio.currency === "BRL" && fxRate) {
      return acc + valuation.currentValue * fxRate;
    }
    return acc;
  }, 0);

  const positionsValue = stocksValue + bondsValue;
  const cash = Number(portfolio.cash_balance);
  const totalValue = cash + positionsValue;

  return {
    totalValue,
    positionsValue,
    stocksValue,
    bondsValue,
    cash,
    fxRate,
  };
}
