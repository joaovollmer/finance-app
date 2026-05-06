import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["yahoo-finance2"],
  },
};

// Sentry só processa sourcemaps/uploads se SENTRY_AUTH_TOKEN existir; em dev
// e nas builds de preview sem token, o SDK roda normalmente em runtime
// (capturando erros) mas não envia sourcemaps. Sem DSN setado, o init nos
// arquivos sentry.*.config.ts é no-op.
const sentryEnabled = Boolean(
  process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
