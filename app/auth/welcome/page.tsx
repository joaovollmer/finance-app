import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem sessão: provavelmente abriu o link em outro browser. Mande pro login.
  if (!user) {
    redirect("/login?confirmed=1");
  }

  // Se já completou onboarding, vai direto pra carteira.
  const { data: portfolios } = await supabase
    .from("portfolios")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  const next = portfolios && portfolios.length > 0 ? "/carteira" : "/onboarding";

  return (
    <AuthShell>
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-positive-pastel text-3xl text-positive">
          ✓
        </div>
        <h2
          className="text-2xl font-extrabold text-ink"
          style={{ letterSpacing: "-0.03em" }}
        >
          Conta confirmada
        </h2>
        <p className="mt-2 mb-7 text-sm leading-relaxed text-ink-muted">
          Seu e-mail foi verificado e sua conta está ativa. Você já pode
          começar a montar sua carteira simulada.
        </p>

        <Link
          href={next}
          className="w-full rounded-xl bg-brand py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
        >
          {next === "/onboarding"
            ? "Configurar minha carteira"
            : "Ir para minha carteira"}
        </Link>

        <p className="mt-6 text-xs text-ink-faint">
          Bem-vindo ao <span className="font-semibold text-brand">O Investidor</span>.
        </p>
      </div>
    </AuthShell>
  );
}
