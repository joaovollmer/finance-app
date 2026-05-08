import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Endpoint de smoke test do Sentry. Lança uma exceção quando chamado com
// ?secret=<CRON_SECRET>, para confirmar que o servidor está enviando
// eventos para o projeto Sentry. Sem o secret correto, devolve 401 sem
// disparar nada — assim o endpoint pode ficar em produção sem virar
// gerador de ruído. Remova depois de validar o wiring se quiser.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  throw new Error("sentry-check: verificação manual disparada via /api/_sentry-check");
}
