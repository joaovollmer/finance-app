"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PRESETS = [10_000, 50_000, 100_000, 500_000];

type Mode = "fixed" | "deposit";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("fixed");
  const [amount, setAmount] = useState<number | "">(100_000);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "fixed" && (typeof amount !== "number" || amount <= 0)) {
      setError("Informe um valor positivo.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: userResp } = await supabase.auth.getUser();
    const user = userResp.user;
    if (!user) {
      setLoading(false);
      setError("Sessão expirada. Faça login novamente.");
      return;
    }

    const initial = mode === "fixed" ? (amount as number) : 0;
    const { error } = await supabase.from("portfolios").insert({
      user_id: user.id,
      initial_cash: initial,
      cash_balance: initial,
      deposit_mode: mode === "deposit",
      total_deposited: initial,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/carteira");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1
        className="text-[22px] font-extrabold text-ink"
        style={{ letterSpacing: "-0.03em" }}
      >
        Como você quer começar?
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Defina um saldo imaginário inicial ou deixe a carteira começar zerada
        e vá aportando conforme cada compra.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <ModeCard
          active={mode === "fixed"}
          onClick={() => setMode("fixed")}
          title="Saldo inicial"
          description="Você define um valor imaginário e opera com esse caixa."
        />
        <ModeCard
          active={mode === "deposit"}
          onClick={() => setMode("deposit")}
          title="Sob demanda"
          description="Sem saldo prévio. Cada compra incrementa seu aporte total."
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        {mode === "fixed" && (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={`rounded-xl border-[1.5px] px-3 py-2.5 text-sm font-semibold transition ${
                    amount === v
                      ? "border-brand bg-brand text-white"
                      : "border-surface-border bg-surface text-ink-muted hover:border-brand-border hover:text-ink"
                  }`}
                >
                  R$ {v.toLocaleString("pt-BR")}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.05em] text-ink-muted">
                Ou um valor personalizado (R$)
              </span>
              <input
                type="number"
                min={1}
                step={100}
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full rounded-xl border-[1.5px] border-surface-border bg-surface px-3.5 py-3 text-sm text-ink outline-none transition focus:border-brand focus:shadow-glow"
              />
            </label>
          </>
        )}

        {mode === "deposit" && (
          <div className="rounded-xl border border-brand-border bg-brand-pastel px-3.5 py-3 text-[13px] leading-relaxed text-brand">
            No modo sob demanda, sua carteira começa zerada. A cada compra,
            o valor é registrado como aporte e some no &quot;Total
            aportado&quot;. Seu resultado mostra a diferença entre patrimônio
            atual e o que você aportou. Vendas geram saldo em caixa que pode
            ser reaproveitado em compras futuras antes de exigir novo aporte.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-negative-border bg-negative-pastel px-3.5 py-2.5 text-[13px] font-medium text-negative">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Criando carteira..." : "Começar a investir"}
        </button>
      </form>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-xl border-[1.5px] p-4 text-left transition ${
        active
          ? "border-brand bg-brand-pastel text-ink"
          : "border-surface-border bg-surface text-ink-muted hover:border-brand-border hover:text-ink"
      }`}
    >
      <span className="text-sm font-bold text-ink">{title}</span>
      <span className="text-[12px] leading-relaxed">{description}</span>
    </button>
  );
}
