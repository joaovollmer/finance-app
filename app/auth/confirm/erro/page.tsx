import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";

export const dynamic = "force-dynamic";

const REASON_MESSAGES: Record<string, string> = {
  link_invalido:
    "O link de confirmação está incompleto. Talvez tenha sido aberto duas vezes ou o formato seja antigo.",
};

export default function ConfirmErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const raw = searchParams.reason ?? "";
  const message =
    REASON_MESSAGES[raw] ??
    (raw
      ? decodeURIComponent(raw)
      : "Não foi possível confirmar seu e-mail.");

  return (
    <AuthShell>
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-negative-pastel text-3xl text-negative">
          !
        </div>
        <h2
          className="text-2xl font-extrabold text-ink"
          style={{ letterSpacing: "-0.03em" }}
        >
          Confirmação inválida
        </h2>
        <p className="mt-2 mb-2 text-sm leading-relaxed text-ink-muted">
          {message}
        </p>
        <p className="mb-7 text-xs leading-relaxed text-ink-faint">
          Links de confirmação expiram em 24h e só podem ser usados uma vez.
          Tente entrar; se a conta já foi confirmada, o login funciona
          direto. Caso contrário, refaça o cadastro para receber um novo
          link.
        </p>

        <div className="flex w-full flex-col gap-2.5">
          <Link
            href="/login"
            className="w-full rounded-xl bg-brand py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
          >
            Tentar entrar
          </Link>
          <Link
            href="/cadastro"
            className="w-full rounded-xl border-[1.5px] border-surface-border bg-surface py-3 text-center text-sm font-semibold text-ink-muted transition hover:text-ink"
          >
            Criar nova conta
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
