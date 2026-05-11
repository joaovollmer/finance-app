// Provider Finnhub — cobertura forte para tickers US. Requer FINNHUB_API_KEY
// (free tier: 60 req/min). Sem chave, o provider declara `enabled: false` e
// o orquestrador o pula. Para B3 a cobertura é fraca, então só rodamos
// fora dela.
//
// Docs: https://finnhub.io/docs/api/company-news

import * as Sentry from "@sentry/nextjs";
import type {
  NewsItem,
  NewsProvider,
  NewsProviderContext,
  NewsSentiment,
} from "../types";

interface FinnhubCompanyNews {
  category?: string;
  datetime?: number;
  headline?: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
}

// Finnhub aceita só YYYY-MM-DD; pegamos a janela dos últimos 30 dias para
// não buscar histórico inteiro a cada request.
function dateRange(): { from: string; to: string } {
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: past.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

// Finnhub só expõe sentiment numérico no endpoint pago — o de news plain
// não tem score. Deixamos `undefined` por enquanto; quando expandirmos
// para o endpoint pago, populamos aqui.
function inferSentiment(): NewsSentiment | undefined {
  return undefined;
}

export const finnhubProvider: NewsProvider = {
  id: "finnhub",
  enabled: () => Boolean(process.env.FINNHUB_API_KEY),
  async fetch(ctx: NewsProviderContext): Promise<NewsItem[]> {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return [];

    // Para B3 a base de dados é fraca; Finnhub conhece bem US/EU. Pulamos
    // tickers `.SA` para evitar respostas vazias contando como hit.
    if (ctx.isB3) return [];

    const { from, to } = dateRange();
    const url =
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ctx.displayTicker)}` +
      `&from=${from}&to=${to}&token=${encodeURIComponent(key)}`;

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        // Cache de 15min alinhado com o cache em memória do orquestrador.
        next: { revalidate: 900 },
      });
      if (!res.ok) {
        throw new Error(`Finnhub respondeu ${res.status}`);
      }
      const arr = (await res.json()) as FinnhubCompanyNews[];

      return (Array.isArray(arr) ? arr : [])
        .filter((n) => n.headline && n.url)
        .slice(0, ctx.limit)
        .map<NewsItem>((n) => ({
          title: n.headline!,
          link: n.url!,
          publisher: n.source ?? "Finnhub",
          publishedAt: n.datetime
            ? new Date(n.datetime * 1000).toISOString()
            : new Date().toISOString(),
          thumbnail: n.image || undefined,
          source: "finnhub",
          sentiment: inferSentiment(),
        }));
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: "news", source: "finnhub" },
        extra: { ticker: ctx.ticker },
      });
      return [];
    }
  },
};
