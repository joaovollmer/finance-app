"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AssetClass } from "@/lib/market/types";
import { formatCurrency } from "@/lib/portfolio/valuation";

interface Props {
  portfolioId: string;
  portfolioCurrency: string;
  ticker: string;
  assetClass: AssetClass;
  price: number;
  currency: string;
  cashBalance: number;
  ownedQuantity: number;
  /** Taxa de câmbio para converter `currency` -> `portfolioCurrency`.
   *  Obrigatória quando as moedas diferem. */
  fxRate?: number;
  fxDate?: string;
}

export default function OrderForm({
  portfolioId,
  portfolioCurrency,
  ticker,
  assetClass,
  price,
  currency,
  cashBalance,
  ownedQuantity,
  fxRate,
  fxDate,
}: Props) {
  const router = useRouter();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const qty = typeof quantity === "number" ? quantity : 0;
  const totalNative = qty * price;

  const needsFx = currency !== portfolioCurrency;
  const effectiveFx = needsFx ? fxRate ?? 0 : 1;
  const cashAmount = totalNative * effectiveFx;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (qty <= 0) {
      setError("Quantidade deve ser positiva.");
      return;
    }
    if (needsFx && (!fxRate || fxRate <= 0)) {
      setError("Câmbio indisponível para esta operação.");
      return;
    }
    if (side === "buy" && cashAmount > cashBalance) {
      setError("Saldo insuficiente para essa compra.");
      return;
    }
    if (side === "sell" && qty > ownedQuantity) {
      setError("Você não tem quantidade suficiente desse ativo.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("execute_order", {
      p_portfolio_id: portfolioId,
      p_ticker: ticker,
      p_asset_class: assetClass,
      p_side: side,
      p_quantity: qty,
      p_price: price,
      p_cash_amount: Number(cashAmount.toFixed(2)),
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setInfo(
      side === "buy"
        ? `Compra executada: ${qty} × ${formatCurrency(price, currency)}`
        : `Venda executada: ${qty} × ${formatCurrency(price, currency)}`
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide("buy")}
          className={`rounded-md py-2 text-sm font-medium transition ${
            side === "buy"
              ? "bg-emerald-600 text-white"
              : "bg-surface-muted text-slate-700 hover:bg-surface-border"
          }`}
        >
          Comprar
        </button>
        <button
          type="button"
          onClick={() => setSide("sell")}
          className={`rounded-md py-2 text-sm font-medium transition ${
            side === "sell"
              ? "bg-red-600 text-white"
              : "bg-surface-muted text-slate-700 hover:bg-surface-border"
          }`}
        >
          Vender
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Quantidade
        </span>
        <input
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) =>
            setQuantity(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-full rounded-lg border border-surface-border px-3 py-2 outline-none focus:border-brand"
        />
      </label>

      <div className="rounded-lg bg-surface-muted p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Cotação</span>
          <span className="font-medium">{formatCurrency(price, currency)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-slate-600">Total estimado</span>
          <span className="font-semibold">
            {formatCurrency(totalNative, currency)}
          </span>
        </div>
        {needsFx && (
          <>
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>
                Câmbio {currency}/{portfolioCurrency}
                {fxDate ? ` · ${fxDate}` : ""}
              </span>
              <span>
                {fxRate
                  ? fxRate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })
                  : "—"}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-600">
                Total em {portfolioCurrency}
              </span>
              <span className="font-semibold">
                {formatCurrency(cashAmount, portfolioCurrency)}
              </span>
            </div>
          </>
        )}
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>Saldo em caixa</span>
          <span>{formatCurrency(cashBalance, portfolioCurrency)}</span>
        </div>
        {ownedQuantity > 0 && (
          <div className="flex justify-between text-xs text-slate-500">
            <span>Posição atual</span>
            <span>{ownedQuantity}</span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-emerald-700">{info}</p>}

      <button
        type="submit"
        disabled={loading}
        className={`w-full rounded-lg py-2.5 font-medium text-white transition disabled:opacity-60 ${
          side === "buy"
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {loading
          ? "Executando..."
          : side === "buy"
            ? "Confirmar compra"
            : "Confirmar venda"}
      </button>

      <p className="text-xs text-slate-500">
        A ordem é executada na cotação atual exibida. Cotações fora do horário
        de pregão usam o último preço disponível.
        {needsFx
          ? " Para ativos em moeda estrangeira, usamos o PTAX do BCB para converter ao saldo em caixa."
          : ""}
      </p>
    </form>
  );
}
