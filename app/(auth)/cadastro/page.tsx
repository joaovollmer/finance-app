"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AuthShell from "@/components/auth/AuthShell";

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/carteira");
      router.refresh();
    } else {
      setInfo(
        "Cadastro realizado. Verifique seu e-mail para confirmar a conta antes de entrar."
      );
    }
  }

  return (
    <AuthShell>
      <div className="mb-8 flex rounded-xl bg-surface-muted p-1">
        <Link
          href="/login"
          className="flex-1 rounded-lg px-4 py-2.5 text-center text-[13px] font-bold text-ink-faint transition hover:text-ink"
        >
          Entrar
        </Link>
        <button
          className="flex-1 rounded-lg bg-surface px-4 py-2.5 text-[13px] font-bold text-ink shadow-sm"
          aria-current="page"
        >
          Criar conta
        </button>
      </div>

      <h2
        className="text-2xl font-extrabold text-ink"
        style={{ letterSpacing: "-0.03em" }}
      >
        Comece agora
      </h2>
      <p className="mt-1.5 mb-7 text-sm text-ink-muted">
        Crie sua conta e comece a investir simulando.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Field label="E-mail">
          <Input
            type="email"
            placeholder="seu@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Senha">
          <Input
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirmar senha">
          <Input
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        {error && (
          <div className="rounded-xl border border-negative-border bg-negative-pastel px-3.5 py-2.5 text-[13px] font-medium text-negative">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-xl border border-positive-border bg-positive-pastel px-3.5 py-2.5 text-[13px] font-medium text-positive">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Criando..." : "Criar minha conta"}
        </button>
      </form>

      <p className="mt-7 text-center text-xs leading-relaxed text-ink-faint">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-brand">
          Entrar
        </Link>
      </p>
    </AuthShell>
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
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.05em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border-[1.5px] border-surface-border bg-surface px-3.5 py-3 text-sm text-ink outline-none transition focus:border-brand focus:shadow-glow"
    />
  );
}
