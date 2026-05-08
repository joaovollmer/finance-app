import * as Sentry from "@sentry/nextjs";

// Next.js 14 + @sentry/nextjs v8+ exigem este arquivo na raiz para que
// `sentry.server.config.ts` / `sentry.edge.config.ts` sejam carregados
// no runtime correto. Sem ele, o SDK do servidor nunca inicializa e
// erros de Server Components / route handlers / cron NÃO chegam no Sentry
// — foi o que causou "0 issues" mesmo com DSN configurado na Vercel.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Repassa erros de Server Components para o Sentry (App Router).
export const onRequestError = Sentry.captureRequestError;
