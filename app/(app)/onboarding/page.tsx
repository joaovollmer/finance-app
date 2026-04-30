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
      <h1 className="text-2xl font-semibold text-slate-900">
        Quanto você quer investir?
      </h1>
      <p className="mt-2 text-slate-600">
        Defina o saldo imaginário inicial da sua carteira. Você poderá ajustar
        depois criando uma nova carteira.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v)}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                amount === v
                  ? "border-brand bg-brand text-white"
                  : "border-surface-border bg-white text-slate-700 hover:bg-surface-muted"
              }`}
            >
              R$ {v.toLocaleString("pt-BR")}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
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
            className="w-full rounded-lg border border-surface-border px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand py-2.5 font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Criando carteira..." : "Começar a investir"}
        </button>
      </form>
    </div>
  );
}
