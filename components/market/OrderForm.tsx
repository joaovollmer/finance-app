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
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const qty = quantity;
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-surface-muted p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`rounded-lg py-2 text-[13px] font-bold transition ${
              side === s
                ? s === "buy"
                  ? "bg-positive text-white"
                  : "bg-negative text-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {s === "buy" ? "Comprar" : "Vender"}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-muted">
          Quantidade
        </span>
        <div className="flex items-center overflow-hidden rounded-xl border-[1.5px] border-surface-border bg-surface">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="border-r border-surface-border bg-surface-muted px-3.5 py-2.5 text-base text-ink-muted hover:text-ink"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="tabular flex-1 border-none bg-transparent py-2.5 text-center text-base font-bold text-ink outline-none"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="border-l border-surface-border bg-surface-muted px-3.5 py-2.5 text-base text-ink-muted hover:text-ink"
          >
            +
          </button>
        </div>
      </label>

      <div className="flex flex-col gap-1.5 rounded-xl border border-surface-border-light bg-surface-muted px-3.5 py-3">
        <Row label="Cotação" value={formatCurrency(price, currency)} />
        <Row
          label="Total estimado"
          value={formatCurrency(totalNative, currency)}
          bold
        />
        {needsFx && (
          <>
            <Row
              label={`Câmbio ${currency}/${portfolioCurrency}${fxDate ? ` · ${fxDate}` : ""}`}
              value={
                fxRate
                  ? fxRate.toLocaleString("pt-BR", {
                      maximumFractionDigits: 4,
                    })
                  : "—"
              }
              hint
            />
            <Row
              label={`Total em ${portfolioCurrency}`}
              value={formatCurrency(cashAmount, portfolioCurrency)}
              bold
            />
          </>
        )}
        <Row
          label="Saldo em caixa"
          value={formatCurrency(cashBalance, portfolioCurrency)}
          hint
        />
        {ownedQuantity > 0 && (
          <Row label="Posição atual" value={`${ownedQuantity} unid.`} hint />
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-negative-border bg-negative-pastel px-3.5 py-2.5 text-[13px] font-medium text-negative">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-xl border border-positive-border bg-positive-pastel px-3.5 py-2.5 text-[13px] font-medium text-positive">
          ✓ {info}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60 ${
          side === "buy" ? "bg-positive" : "bg-negative"
        }`}
        style={{ letterSpacing: "-0.01em" }}
      >
        {loading
          ? "Executando..."
          : side === "buy"
            ? `Confirmar compra · ${formatCurrency(needsFx ? cashAmount : totalNative, needsFx ? portfolioCurrency : currency)}`
            : `Confirmar venda · ${formatCurrency(needsFx ? cashAmount : totalNative, needsFx ? portfolioCurrency : currency)}`}
      </button>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Ordem executada na cotação atual exibida. Cotações fora do pregão usam
        o último preço disponível.
        {needsFx
          ? " Para ativos em moeda estrangeira, usamos o PTAX do BCB."
          : ""}
      </p>
    </form>
  );
}

function Row({
  label,
  value,
  bold,
  hint,
}: {
  label: string;
  value: string;
  bold?: boolean;
  hint?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`${hint ? "text-[11px]" : "text-xs"} text-ink-muted`}
      >
        {label}
      </span>
      <span
        className={`tabular text-[13px] ${bold ? "font-bold text-ink" : "font-medium text-ink"}`}
      >
        {value}
      </span>
    </div>
  );
}
