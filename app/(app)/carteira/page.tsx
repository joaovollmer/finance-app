import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getQuote } from "@/lib/market/yahoo";
import { getUsdToBrl } from "@/lib/market/bcb";
import { getBrRates, getUsRates } from "@/lib/market/rates";
import {
  formatCurrency,
  formatPercent,
  pnl,
  type HoldingRow,
  type PortfolioRow,
} from "@/lib/portfolio/valuation";
import {
  describeFixedIncome,
  valueFixedIncome,
  type RateSnapshot,
} from "@/lib/portfolio/fixed_income";
import PortfolioChart, {
  type SeriesPoint,
} from "@/components/charts/PortfolioChart";
import { SectionCard, StatCard, Badge } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function CarteiraPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: portfolios } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  const portfolio = portfolios?.[0] as PortfolioRow | undefined;
  if (!portfolio) redirect("/onboarding");

  const { data: holdingsRaw } = await supabase
    .from("holdings")
    .select("*")
    .eq("portfolio_id", portfolio.id);

  const holdings = (holdingsRaw ?? []) as HoldingRow[];

  // Particionamos: títulos de RF não passam pelo Yahoo — são marcados a
  // mercado pela taxa do indexador.
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

  // Snapshot de taxas para precificar a renda fixa, só busca se houver títulos
  let rateSnapshot: RateSnapshot = {};
  if (bondHoldings.length > 0) {
    const [br, us] = await Promise.all([
      getBrRates().catch(() => []),
      getUsRates().catch(() => []),
    ]);
    rateSnapshot = {
      selicAnnual: br.find((r) => r.code === "selic")?.ratePct,
      cdiAnnual: br.find((r) => r.code === "cdi")?.ratePct,
      ipcaAnnual: br.find((r) => r.code === "ipca")?.ratePct,
    };
    // Para holdings de Treasury, o yield está cravado no fixed_rate da
    // própria holding (curva no momento da compra), então não precisamos
    // injetar no snapshot.
    void us;
  }

  const enrichedBonds = bondHoldings.map((h) => {
    const valuation = valueFixedIncome({
      indexer: h.indexer!,
      indexPercent: h.index_percent ?? null,
      fixedRate: h.fixed_rate ?? null,
      principal: Number(h.principal ?? h.avg_price),
      purchaseDate: h.purchase_date ?? new Date().toISOString().slice(0, 10),
      rates: rateSnapshot,
    });
    return { holding: h, valuation };
  });

  const hasUsd =
    enrichedStocks.some(
      ({ holding, quote }) =>
        (quote?.currency ??
          (holding.asset_class === "stock_us" ? "USD" : "BRL")) !==
        portfolio.currency
    ) || bondHoldings.some((h) => h.asset_class === "bond_us");
  const fx = hasUsd ? await getUsdToBrl().catch(() => null) : null;

  const stocksValue = enrichedStocks.reduce((acc, { holding, quote }) => {
    const price = quote?.price ?? Number(holding.avg_price);
    const ccy =
      quote?.currency ??
      (holding.asset_class === "stock_us" ? "USD" : "BRL");
    const native = holding.quantity * price;
    if (ccy === portfolio.currency) return acc + native;
    if (ccy === "USD" && portfolio.currency === "BRL" && fx) {
      return acc + native * fx.rate;
    }
    return acc;
  }, 0);

  const bondsValue = enrichedBonds.reduce((acc, { holding, valuation }) => {
    const ccy = holding.asset_class === "bond_us" ? "USD" : "BRL";
    if (ccy === portfolio.currency) return acc + valuation.currentValue;
    if (ccy === "USD" && portfolio.currency === "BRL" && fx) {
      return acc + valuation.currentValue * fx.rate;
    }
    return acc;
  }, 0);

  const positionsValue = stocksValue + bondsValue;

  const totalValue = Number(portfolio.cash_balance) + positionsValue;
  const totalPnL = totalValue - Number(portfolio.initial_cash);
  const totalPnLPct =
    portfolio.initial_cash > 0
      ? (totalPnL / Number(portfolio.initial_cash)) * 100
      : 0;

  const { data: snapshots } = await supabase
    .from("portfolio_snapshots")
    .select("taken_on,total_value")
    .eq("portfolio_id", portfolio.id)
    .order("taken_on", { ascending: true });

  const series: SeriesPoint[] = [
    {
      date: portfolio.created_at.slice(0, 10),
      value: portfolio.initial_cash,
    },
    ...((snapshots ?? []) as { taken_on: string; total_value: number }[]).map(
      (s) => ({ date: s.taken_on, value: s.total_value })
    ),
    {
      date: new Date().toISOString().slice(0, 10),
      value: totalValue,
    },
  ];

  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("portfolio_snapshots")
    .upsert(
      {
        portfolio_id: portfolio.id,
        taken_on: today,
        total_value: Number(totalValue.toFixed(2)),
      },
      { onConflict: "portfolio_id,taken_on" }
    );

  const updatedLabel = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="mb-6">
        <h1
          className="text-[22px] font-extrabold text-ink"
          style={{ letterSpacing: "-0.03em" }}
        >
          Carteira
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Atualizado agora · {updatedLabel}
        </p>
      </div>

      <section className="grid gap-3.5 sm:grid-cols-3">
        <StatCard
          label="Patrimônio Total"
          value={formatCurrency(totalValue, portfolio.currency)}
          hint="Posições + caixa"
          icon="◈"
        />
        <StatCard
          label="Saldo em Caixa"
          value={formatCurrency(portfolio.cash_balance, portfolio.currency)}
          hint={`de ${formatCurrency(portfolio.initial_cash, portfolio.currency)} aportados`}
          icon="◎"
        />
        <StatCard
          label="Resultado Total"
          value={formatCurrency(totalPnL, portfolio.currency)}
          hint={formatPercent(totalPnLPct) + " desde o início"}
          tone={totalPnL >= 0 ? "positive" : "negative"}
          icon={totalPnL >= 0 ? "▲" : "▼"}
        />
      </section>

      {hasUsd && fx && (
        <p className="text-xs text-ink-faint">
          Posições em USD convertidas para {portfolio.currency} pelo PTAX do
          BCB ({fx.date}): 1 USD ={" "}
          {fx.rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}{" "}
          {portfolio.currency}.
        </p>
      )}
      {hasUsd && !fx && (
        <div className="rounded-xl border border-negative-border bg-negative-pastel px-3 py-2 text-xs text-negative">
          Não foi possível obter o câmbio do BCB; posições em USD foram
          ignoradas no patrimônio total.
        </div>
      )}

      <SectionCard
        title="Evolução do patrimônio"
        subtitle="Snapshot diário do valor total da carteira"
      >
        <PortfolioChart data={series} currency={portfolio.currency} />
      </SectionCard>

      <SectionCard
        title="Ações e ETFs"
        subtitle={`${enrichedStocks.length} ${enrichedStocks.length === 1 ? "posição" : "posições"} em renda variável`}
        action={
          <Link
            href="/mercado"
            className="rounded-lg bg-brand-pastel px-4 py-2 text-xs font-semibold text-brand transition hover:opacity-80"
          >
            + Comprar
          </Link>
        }
      >
        {enrichedStocks.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Sem posições em ações ainda. Vá ao{" "}
            <Link href="/mercado" className="font-semibold text-brand">
              Mercado
            </Link>{" "}
            para começar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-surface-border">
                  {["Ativo", "Qtd.", "Preço médio", "Cotação", "Variação", "Valor atual", "Resultado"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint ${i === 0 ? "text-left" : "text-right"}`}
                      >
                        {h}
                      </th>
                    )
                  )}
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {enrichedStocks.map(({ holding, quote }) => {
                  const price = quote?.price ?? holding.avg_price;
                  const ccy =
                    quote?.currency ??
                    (holding.asset_class === "stock_us" ? "USD" : "BRL");
                  const market = holding.quantity * price;
                  const result = pnl(holding.quantity, holding.avg_price, price);
                  const display = quote?.displayTicker ?? holding.ticker;
                  const dayChange = quote?.changePercent ?? 0;
                  return (
                    <tr
                      key={holding.ticker}
                      className="border-b border-surface-border-light transition hover:bg-surface-muted"
                    >
                      <td className="px-2.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-pastel text-[11px] font-extrabold text-brand">
                            {display.slice(0, 2)}
                          </div>
                          <div>
                            <Link
                              href={`/ativo/${encodeURIComponent(display)}`}
                              className="text-[13px] font-bold text-ink hover:text-brand"
                            >
                              {display}
                            </Link>
                            <div className="mt-0.5 text-[11px] text-ink-faint">
                              {quote?.name ?? ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="tabular px-2.5 py-3 text-right font-medium text-ink-muted">
                        {holding.quantity}
                      </td>
                      <td className="tabular px-2.5 py-3 text-right text-ink-muted">
                        {formatCurrency(holding.avg_price, ccy)}
                      </td>
                      <td className="tabular px-2.5 py-3 text-right font-semibold text-ink">
                        {formatCurrency(price, ccy)}
                      </td>
                      <td className="px-2.5 py-3 text-right">
                        <Badge value={dayChange} pct={dayChange} />
                      </td>
                      <td className="tabular px-2.5 py-3 text-right font-semibold text-ink">
                        {formatCurrency(market, ccy)}
                      </td>
                      <td className="px-2.5 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`tabular text-[13px] font-bold ${result.absolute >= 0 ? "text-positive" : "text-negative"}`}
                          >
                            {result.absolute >= 0 ? "+" : ""}
                            {formatCurrency(result.absolute, ccy)}
                          </span>
                          <span
                            className={`text-[11px] ${result.percent >= 0 ? "text-positive" : "text-negative"}`}
                          >
                            {formatPercent(result.percent)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2.5 py-3 text-right">
                        <Link
                          href={`/ativo/${encodeURIComponent(display)}`}
                          className="rounded-md border border-surface-border bg-surface px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-pastel"
                        >
                          Operar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Renda Fixa"
        subtitle={`${enrichedBonds.length} ${enrichedBonds.length === 1 ? "título" : "títulos"} aplicados`}
        action={
          <Link
            href="/mercado/renda-fixa"
            className="rounded-lg bg-brand-pastel px-4 py-2 text-xs font-semibold text-brand transition hover:opacity-80"
          >
            + Aplicar
          </Link>
        }
      >
        {enrichedBonds.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Sem títulos de renda fixa ainda. Confira as taxas em{" "}
            <Link
              href="/mercado/renda-fixa"
              className="font-semibold text-brand"
            >
              Renda Fixa
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-surface-border">
                  {[
                    "Título",
                    "Aplicado",
                    "Taxa",
                    "Vencimento",
                    "Valor atual",
                    "Resultado",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint ${i === 0 ? "text-left" : "text-right"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrichedBonds.map(({ holding, valuation }) => {
                  const ccy =
                    holding.asset_class === "bond_us" ? "USD" : "BRL";
                  const indexerLabel = describeFixedIncome(
                    holding.indexer!,
                    holding.index_percent ?? null,
                    holding.fixed_rate ?? null
                  );
                  const principal = Number(
                    holding.principal ?? holding.avg_price
                  );
                  return (
                    <tr
                      key={holding.ticker}
                      className="border-b border-surface-border-light transition hover:bg-surface-muted"
                    >
                      <td className="px-2.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-pastel text-base font-bold text-brand">
                            ◇
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-ink">
                              {indexerLabel}
                            </div>
                            <div className="mt-0.5 text-[11px] text-ink-faint">
                              {holding.indexer === "treasury"
                                ? "US Treasury"
                                : "Tesouro Direto / Renda Fixa BR"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="tabular px-2.5 py-3 text-right text-ink-muted">
                        {formatCurrency(principal, ccy)}
                      </td>
                      <td className="tabular px-2.5 py-3 text-right font-semibold text-ink">
                        {valuation.effectiveRate.toFixed(2)}% a.a.
                      </td>
                      <td className="px-2.5 py-3 text-right text-[12px] text-ink-muted">
                        {holding.maturity_date ?? "—"}
                      </td>
                      <td className="tabular px-2.5 py-3 text-right font-semibold text-ink">
                        {formatCurrency(valuation.currentValue, ccy)}
                      </td>
                      <td className="px-2.5 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`tabular text-[13px] font-bold ${valuation.pnlAbsolute >= 0 ? "text-positive" : "text-negative"}`}
                          >
                            {valuation.pnlAbsolute >= 0 ? "+" : ""}
                            {formatCurrency(valuation.pnlAbsolute, ccy)}
                          </span>
                          <span
                            className={`text-[11px] ${valuation.pnlPercent >= 0 ? "text-positive" : "text-negative"}`}
                          >
                            {formatPercent(valuation.pnlPercent)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
