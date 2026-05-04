"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AuthShell from "@/components/auth/AuthShell";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
          Carregando...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/carteira";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  return (
    <AuthShell>
      <div className="mb-8 flex rounded-xl bg-surface-muted p-1">
        <button
          className="flex-1 rounded-lg bg-surface px-4 py-2.5 text-[13px] font-bold text-ink shadow-sm"
          aria-current="page"
        >
          Entrar
        </button>
        <Link
          href="/cadastro"
          className="flex-1 rounded-lg px-4 py-2.5 text-center text-[13px] font-bold text-ink-faint transition hover:text-ink"
        >
          Criar conta
        </Link>
      </div>

      <h2
        className="text-2xl font-extrabold text-ink"
        style={{ letterSpacing: "-0.03em" }}
      >
        Bem-vindo de volta
      </h2>
      <p className="mt-1.5 mb-7 text-sm text-ink-muted">
        Acesse sua carteira e acompanhe seus investimentos.
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>

        {error && (
          <div className="rounded-xl border border-negative-border bg-negative-pastel px-3.5 py-2.5 text-[13px] font-medium text-negative">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar na conta"}
        </button>
      </form>

      <p className="mt-7 text-center text-xs leading-relaxed text-ink-faint">
        Ao continuar, você concorda com os{" "}
        <span className="font-semibold text-brand">Termos de Uso</span> e{" "}
        <span className="font-semibold text-brand">Privacidade</span>.
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
