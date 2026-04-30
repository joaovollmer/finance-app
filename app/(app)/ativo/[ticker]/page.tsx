import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getHistory, getQuote } from "@/lib/market/yahoo";
import { formatCurrency, formatPercent } from "@/lib/portfolio/valuation";
import PriceChart from "@/components/market/PriceChart";
import OrderForm from "@/components/market/OrderForm";

export const dynamic = "force-dynamic";

export default async function AtivoPage({
  params,
}: {
  params: { ticker: string };
}) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const decoded = decodeURIComponent(params.ticker);

  let quote;
  let candles;
  try {
    [quote, candles] = await Promise.all([
      getQuote(decoded),
      getHistory(decoded, "1y"),
    ]);
  } catch {
    notFound();
  }

  const { data: portfolios } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  const portfolio = portfolios?.[0];
  if (!portfolio) redirect("/onboarding");

  const { data: holding } = await supabase
    .from("holdings")
    .select("*")
    .eq("portfolio_id", portfolio.id)
    .eq("ticker", quote.ticker)
    .maybeSingle();

  const ownedQty = holding ? Number(holding.quantity) : 0;
  const positive = quote.change >= 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-6">
        <div>
          <Link
            href="/mercado"
            className="text-sm text-brand hover:underline"
          >
            ← Voltar ao mercado
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            {quote.displayTicker}
          </h1>
          <p className="text-slate-600">{quote.name}</p>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-slate-900">
              {formatCurrency(quote.price, quote.currency)}
            </span>
            <span
              className={
                positive ? "text-emerald-700" : "text-red-600"
              }
            >
              {formatCurrency(quote.change, quote.currency)} (
              {formatPercent(quote.changePercent)})
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {quote.exchange} · {quote.assetClass === "stock_br" ? "B3" : "EUA"}{" "}
            · moeda: {quote.currency}
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Histórico de preço
          </h2>
          <div className="mt-3">
            <PriceChart
              ticker={quote.ticker}
              initial={candles}
              currency={quote.currency}
            />
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Operar</h2>
        {quote.currency !== portfolio.currency && (
          <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
            Atenção: este ativo é cotado em {quote.currency}, enquanto sua
            carteira está em {portfolio.currency}. No MVP, a operação é
            registrada em {quote.currency} sem conversão cambial.
          </p>
        )}
        <div className="mt-4">
          <OrderForm
            portfolioId={portfolio.id}
            ticker={quote.ticker}
            assetClass={quote.assetClass}
            price={quote.price}
            currency={quote.currency}
            cashBalance={Number(portfolio.cash_balance)}
            ownedQuantity={ownedQty}
          />
        </div>
      </aside>
    </div>
  );
}
