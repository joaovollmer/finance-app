import Link from "next/link";
import LogoMark from "@/components/ui/LogoMark";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface-muted">
      <header className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span
            className="text-[17px] font-bold text-ink"
            style={{ letterSpacing: "-0.02em" }}
          >
            O <span className="text-brand">Investidor</span>
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-[1100px] px-6 pb-24 pt-16 text-center">
        <p className="mb-5 inline-block rounded-full border border-brand-border bg-brand-pastel px-4 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand">
          Simulador educacional
        </p>
        <h1
          className="mx-auto max-w-[880px] text-5xl font-extrabold leading-[1.05] text-ink md:text-6xl"
          style={{ letterSpacing: "-0.04em" }}
        >
          Invista com inteligência,
          <br />
          <span className="text-ink-muted">aprenda sem risco.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[640px] text-lg leading-relaxed text-ink-muted">
          Monte sua carteira com cotações reais da B3 e EUA, simule operações,
          acompanhe a evolução do patrimônio e estude o mercado — sem arriscar
          um centavo real.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/cadastro"
            className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Começar agora
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-surface-border bg-surface px-6 py-3 text-sm font-bold text-ink-muted transition hover:text-ink"
          >
            Já tenho conta
          </Link>
        </div>

        <ul className="mx-auto mt-20 grid max-w-[960px] gap-4 sm:grid-cols-3">
          {[
            {
              title: "Saldo flexível",
              body: "Você decide com quanto dinheiro imaginário começar.",
            },
            {
              title: "Mercado real",
              body: "Cotações da B3 e dos EUA via Yahoo Finance.",
            },
            {
              title: "Renda fixa",
              body: "Selic, CDI, IPCA e Treasuries para diversificar.",
            },
          ].map((f) => (
            <li
              key={f.title}
              className="rounded-card border border-surface-border bg-surface p-6 text-left"
            >
              <strong className="block text-base font-bold text-ink">
                {f.title}
              </strong>
              <span className="mt-1 block text-sm text-ink-muted">
                {f.body}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
