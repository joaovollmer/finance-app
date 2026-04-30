import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-2xl border border-surface-border bg-white p-10 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-brand">
          Simulador educacional
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
          Aprenda a investir sem arriscar dinheiro real.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Defina uma quantia imaginária, monte sua carteira com dados de
          mercado em tempo real e acompanhe a evolução da sua rentabilidade.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/cadastro"
            className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white transition hover:bg-brand-dark"
          >
            Criar conta
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-surface-border px-5 py-2.5 font-medium text-slate-700 transition hover:bg-surface-muted"
          >
            Já tenho conta
          </Link>
        </div>

        <ul className="mt-10 grid gap-4 text-sm text-slate-700 sm:grid-cols-3">
          <li className="rounded-lg bg-surface-muted p-4">
            <strong className="block text-slate-900">Saldo flexível</strong>
            Você decide com quanto dinheiro imaginário começar.
          </li>
          <li className="rounded-lg bg-surface-muted p-4">
            <strong className="block text-slate-900">Mercado real</strong>
            Cotações de ações brasileiras (B3) e internacionais.
          </li>
          <li className="rounded-lg bg-surface-muted p-4">
            <strong className="block text-slate-900">Acompanhamento</strong>
            Gráficos de evolução da carteira de 1 mês a 5 anos.
          </li>
        </ul>
      </div>
    </main>
  );
}
