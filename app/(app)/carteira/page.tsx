import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getQuote } from "@/lib/market/yahoo";
import { getUsdToBrl } from "@/lib/market/bcb";
import {
  formatCurrency,
  formatPercent,
  pnl,
  type HoldingRow,
  type PortfolioRow,
} from "@/lib/portfolio/valuation";
import PortfolioChart, {
  type SeriesPoint,
} from "@/components/charts/PortfolioChart";

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

  const enriched = await Promise.all(
    holdings.map(async (h) => {
      try {
        const q = await getQuote(h.ticker);
        return { holding: h, quote: q };
      } catch {
        return { holding: h, quote: null };
      }
    })
  );

  // Converte posições em moeda estrangeira para a moeda da carteira (BRL).
  // Sem câmbio disponível, posições USD entram como 0 e exibimos um aviso.
  const hasUsd = enriched.some(
    ({ holding, quote }) =>
      (quote?.currency ?? (holding.asset_class === "stock_us" ? "USD" : "BRL")) !==
      portfolio.currency
  );
  const fx = hasUsd ? await getUsdToBrl().catch(() => null) : null;

  const positionsValue = enriched.reduce((acc, { holding, quote }) => {
    const price = quote?.price ?? Number(holding.avg_price);
    const ccy =
      quote?.currency ?? (holding.asset_class === "stock_us" ? "USD" : "BRL");
    const native = holding.quantity * price;
    if (ccy === portfolio.currency) return acc + native;
    if (ccy === "USD" && portfolio.currency === "BRL" && fx) {
      return acc + native * fx.rate;
    }
    return acc;
  }, 0);

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

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-3">
        <Card
          label="Patrimônio total"
          value={formatCurrency(totalValue, portfolio.currency)}
        />
        <Card
          label="Saldo em caixa"
          value={formatCurrency(portfolio.cash_balance, portfolio.currency)}
          hint={`de ${formatCurrency(
            portfolio.initial_cash,
            portfolio.currency
          )} iniciais`}
        />
        <Card
          label="Resultado"
          value={formatCurrency(totalPnL, portfolio.currency)}
          hint={formatPercent(totalPnLPct)}
          tone={totalPnL >= 0 ? "positive" : "negative"}
        />
      </section>

      {hasUsd && fx && (
        <p className="text-xs text-slate-500">
          Posições em USD convertidas para {portfolio.currency} pelo PTAX do
          BCB ({fx.date}): 1 USD ={" "}
          {fx.rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}{" "}
          {portfolio.currency}.
        </p>
      )}
      {hasUsd && !fx && (
        <p className="rounded bg-red-50 p-2 text-xs text-red-700">
          Não foi possível obter o câmbio do BCB; posições em USD foram
          ignoradas no patrimônio total. Tente recarregar.
        </p>
      )}

      <section className="rounded-2xl border border-surface-border bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Evolução do patrimônio
        </h2>
        <p className="text-sm text-slate-600">
          Snapshot diário do valor total da carteira.
        </p>
        <div className="mt-4">
          <PortfolioChart data={series} currency={portfolio.currency} />
        </div>
      </section>

      <section className="rounded-2xl border border-surface-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Posições</h2>
          <Link
            href="/mercado"
            className="text-sm font-medium text-brand hover:underline"
          >
            + Comprar ativo
          </Link>
        </div>

        {enriched.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Você ainda não tem posições. Comece em{" "}
            <Link href="/mercado" className="text-brand hover:underline">
              Mercado
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2">Ativo</th>
                  <th>Qtd.</th>
                  <th>Preço médio</th>
                  <th>Cotação</th>
                  <th>Valor atual</th>
                  <th>Resultado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {enriched.map(({ holding, quote }) => {
                  const price = quote?.price ?? holding.avg_price;
                  const ccy = quote?.currency ?? portfolio.currency;
                  const market = holding.quantity * price;
                  const result = pnl(holding.quantity, holding.avg_price, price);
                  const display = quote?.displayTicker ?? holding.ticker;
                  return (
                    <tr key={holding.ticker} className="border-t border-surface-border">
                      <td className="py-3">
                        <Link
                          href={`/ativo/${encodeURIComponent(display)}`}
                          className="font-medium text-slate-900 hover:text-brand"
                        >
                          {display}
                        </Link>
                        <div className="text-xs text-slate-500">{quote?.name ?? ""}</div>
                      </td>
                      <td>{holding.quantity}</td>
                      <td>{formatCurrency(holding.avg_price, ccy)}</td>
                      <td>{formatCurrency(price, ccy)}</td>
                      <td>{formatCurrency(market, ccy)}</td>
                      <td
                        className={
                          result.absolute >= 0
                            ? "text-emerald-700"
                            : "text-red-600"
                        }
                      >
                        {formatCurrency(result.absolute, ccy)}
                        <span className="ml-1 text-xs">
                          ({formatPercent(result.percent)})
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/ativo/${encodeURIComponent(display)}`}
                          className="text-sm text-brand hover:underline"
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
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-red-600"
        : "text-slate-900";
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
