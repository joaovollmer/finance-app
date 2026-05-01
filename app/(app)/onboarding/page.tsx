"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PRESETS = [10_000, 50_000, 100_000, 500_000];

export default function OnboardingPage() {
  const router = useRouter();
  const [amount, setAmount] = useState<number | "">(100_000);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (typeof amount !== "number" || amount <= 0) {
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

    const { error } = await supabase.from("portfolios").insert({
      user_id: user.id,
      initial_cash: amount,
      cash_balance: amount,
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
        Quanto você quer investir?
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Defina o saldo imaginário inicial da sua carteira. Você poderá ajustar
        depois criando uma nova carteira.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
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
