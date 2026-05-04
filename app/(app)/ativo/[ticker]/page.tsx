import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAssetSummary, getHistory, getQuote } from "@/lib/market/yahoo";
import { getUsdToBrl } from "@/lib/market/bcb";
import { formatCurrency } from "@/lib/portfolio/valuation";
import PriceChart from "@/components/market/PriceChart";
import OrderForm from "@/components/market/OrderForm";
import AssetSummaryPanel from "@/components/market/AssetSummaryPanel";
import { SectionCard, Badge } from "@/components/ui/Card";

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
  let summary = null;
  try {
    [quote, candles, summary] = await Promise.all([
      getQuote(decoded),
      getHistory(decoded, "1y"),
      getAssetSummary(decoded).catch(() => null),
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

  const needsFx =
    quote.currency !== portfolio.currency &&
    quote.currency === "USD" &&
    portfolio.currency === "BRL";
  const fx = needsFx ? await getUsdToBrl().catch(() => null) : null;

  return (
    <div>
      <Link
        href="/mercado"
        className="mb-5 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
      >
        ← Voltar ao mercado
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-brand-pastel text-base font-extrabold text-brand">
            {quote.displayTicker.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1
                className="text-[26px] font-extrabold text-ink"
                style={{ letterSpacing: "-0.03em" }}
              >
                {quote.displayTicker}
              </h1>
              <span className="rounded-md border border-surface-border bg-surface-muted px-2 py-[3px] text-[11px] font-semibold text-ink-muted">
                {quote.currency}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">
              {quote.name}
              {quote.exchange ? ` · ${quote.exchange}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div
            className="tabular text-[32px] font-extrabold text-ink"
            style={{ letterSpacing: "-0.03em" }}
          >
            {formatCurrency(quote.price, quote.currency)}
          </div>
          <div className="mt-1 flex items-center justify-end gap-2">
            <Badge value={quote.change} pct={quote.changePercent} />
            <span className="text-xs text-ink-faint">hoje</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <SectionCard
            title="Histórico de preço"
            subtitle="Cotação ao longo do tempo"
          >
            <PriceChart
              ticker={quote.ticker}
              initial={candles}
              currency={quote.currency}
            />
          </SectionCard>

          {summary && (
            <SectionCard
              title="Fundamentos"
              subtitle={`Indicadores de ${summary.longName ?? quote.name}`}
            >
              <AssetSummaryPanel summary={summary} />
            </SectionCard>
          )}
        </div>

        <div>
          <SectionCard
            title="Operar"
            subtitle={`Cotação: ${formatCurrency(quote.price, quote.currency)}`}
          >
            {needsFx && !fx && (
              <p className="mb-3 rounded-xl border border-negative-border bg-negative-pastel px-3 py-2 text-xs text-negative">
                Não foi possível carregar o câmbio do BCB. Tente novamente em
                instantes.
              </p>
            )}
            {needsFx && fx && (
              <p className="mb-3 rounded-xl border border-brand-border bg-brand-pastel px-3 py-2 text-xs text-brand">
                Ativo em {quote.currency}; carteira em {portfolio.currency}.
                Usaremos o PTAX do BCB ({fx.date}) — 1 USD ={" "}
                {fx.rate.toLocaleString("pt-BR", {
                  maximumFractionDigits: 4,
                })}{" "}
                BRL.
              </p>
            )}
            <OrderForm
              portfolioId={portfolio.id}
              portfolioCurrency={portfolio.currency}
              ticker={quote.ticker}
              assetClass={quote.assetClass}
              price={quote.price}
              currency={quote.currency}
              cashBalance={Number(portfolio.cash_balance)}
              ownedQuantity={ownedQty}
              fxRate={fx?.rate}
              fxDate={fx?.date}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
