import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface py-6">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-6 sm:flex-row">
        <p className="text-xs text-ink-faint">
          © {new Date().getFullYear()} O Investidor — plataforma educacional.
          Não é recomendação de investimento.
        </p>
        <nav className="flex gap-4 text-xs text-ink-muted">
          <Link href="/privacidade" className="transition hover:text-ink">
            Privacidade
          </Link>
          <Link href="/termos" className="transition hover:text-ink">
            Termos de uso
          </Link>
        </nav>
      </div>
    </footer>
  );
}
