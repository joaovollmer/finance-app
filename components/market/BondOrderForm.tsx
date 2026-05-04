"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FixedIncomeIndexer } from "@/lib/market/types";

interface Props {
  portfolioId: string;
  portfolioCurrency: string;
  cashBalance: number;
  // Catálogo de títulos exibidos no select
  catalog: BondOption[];
  // Câmbio para converter principais em USD para BRL na hora de debitar
  fxRate?: number;
  fxDate?: string;
}

export interface BondOption {
  id: string;
  label: string; // ex: "Tesouro Selic 2029"
  indexer: FixedIncomeIndexer;
  /** Para pós-fixados (selic/cdi). Ex.: 100 = "100% CDI". */
  indexPercent: number | null;
  /** Para prefixados/IPCA+/treasury. */
  fixedRate: number | null;
  /** "BRL" ou "USD" — moeda nativa do título. */
  currency: "BRL" | "USD";
  assetClass: "bond_br" | "bond_us";
  /** Vencimento sugerido (date YYYY-MM-DD); usuário pode trocar. */
  defaultMaturity: string;
  description: string;
}

export default function BondOrderForm({
  portfolioId,
  portfolioCurrency,
  cashBalance,
  catalog,
  fxRate,
  fxDate,
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(catalog[0]?.id ?? "");
  const [amount, setAmount] = useState<number>(1000);
  const [maturity, setMaturity] = useState<string>(
    catalog[0]?.defaultMaturity ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = catalog.find((b) => b.id === selectedId) ?? catalog[0];

  // Quando troca o título, reseta vencimento sugerido
  function selectBond(id: string) {
    setSelectedId(id);
    const next = catalog.find((b) => b.id === id);
    if (next) setMaturity(next.defaultMaturity);
  }

  const needsFx = selected && selected.currency !== portfolioCurrency;
  const effectiveFx = needsFx ? fxRate ?? 0 : 1;
  const cashAmount = useMemo(
    () => amount * effectiveFx,
    [amount, effectiveFx]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!selected) {
      setError("Escolha um título.");
      return;
    }
    if (amount <= 0) {
      setError("Valor a investir deve ser positivo.");
      return;
    }
    if (needsFx && (!fxRate || fxRate <= 0)) {
      setError("Câmbio indisponível para títulos em USD.");
      return;
    }
    if (cashAmount > cashBalance) {
      setError("Saldo insuficiente em caixa.");
      return;
    }
    if (!maturity) {
      setError("Informe um vencimento.");
      return;
    }

    // Ticker único por compra: inclui tipo + venc. + timestamp pra não colidir
    const ts = Date.now().toString(36);
    const ticker = `${selected.id}_${maturity}_${ts}`.toUpperCase();

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("execute_fixed_income_buy", {
      p_portfolio_id: portfolioId,
      p_ticker: ticker,
      p_asset_class: selected.assetClass,
      p_indexer: selected.indexer,
      p_index_percent: selected.indexPercent,
      p_fixed_rate: selected.fixedRate,
      p_principal: amount,
      p_cash_amount: Number(cashAmount.toFixed(2)),
      p_maturity_date: maturity,
      p_name: selected.label,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setInfo(`Aplicação de ${formatBR(amount, selected.currency)} confirmada em ${selected.label}.`);
    router.refresh();
  }

  if (catalog.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Nenhum título disponível no momento.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <Field label="Título">
        <select
          value={selectedId}
          onChange={(e) => selectBond(e.target.value)}
          className="w-full rounded-xl border-[1.5px] border-surface-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
        >
          {catalog.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>

      {selected && (
        <p className="rounded-xl border border-surface-border-light bg-surface-muted px-3 py-2 text-[12px] leading-relaxed text-ink-muted">
          {selected.description}
        </p>
      )}

      <Field
        label={`Valor a investir (${selected?.currency ?? portfolioCurrency})`}
      >
        <input
          type="number"
          min={1}
          step={50}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-xl border-[1.5px] border-surface-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
        />
      </Field>

      <Field label="Vencimento">
        <input
          type="date"
          value={maturity}
          onChange={(e) => setMaturity(e.target.value)}
          className="w-full rounded-xl border-[1.5px] border-surface-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
        />
      </Field>

      <div className="flex flex-col gap-1.5 rounded-xl border border-surface-border-light bg-surface-muted px-3.5 py-3 text-[13px]">
        <Row
          label="Total a aplicar"
          value={formatBR(amount, selected?.currency ?? portfolioCurrency)}
          bold
        />
        {needsFx && (
          <>
            <Row
              hint
              label={`Câmbio USD/BRL${fxDate ? ` · ${fxDate}` : ""}`}
              value={
                fxRate
                  ? fxRate.toLocaleString("pt-BR", {
                      maximumFractionDigits: 4,
                    })
                  : "—"
              }
            />
            <Row
              bold
              label={`Total em ${portfolioCurrency}`}
              value={formatBR(cashAmount, portfolioCurrency)}
            />
          </>
        )}
        <Row
          hint
          label="Saldo em caixa"
          value={formatBR(cashBalance, portfolioCurrency)}
        />
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
        className="rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Aplicando..." : "Confirmar aplicação"}
      </button>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Marcação a mercado simplificada: rentabilidade calculada pela taxa
        atual do indexador desde a data da compra. Para títulos em USD, o
        valor é convertido em BRL pelo PTAX do BCB.
      </p>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
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
      <span className={`${hint ? "text-[11px]" : "text-xs"} text-ink-muted`}>
        {label}
      </span>
      <span
        className={`tabular text-[13px] ${bold ? "font-bold text-ink" : "text-ink"}`}
      >
        {value}
      </span>
    </div>
  );
}

function formatBR(v: number, currency: string): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
}
