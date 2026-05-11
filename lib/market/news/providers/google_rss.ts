// Provider Google News (RSS) — fallback genérico, multilíngue e sem chave.
// Cobertura BR boa via `hl=pt-BR&gl=BR&ceid=BR:pt-419`. Volátil: o Google
// pode mudar o formato sem aviso, então capturamos exception silenciosamente
// quando o parser não encontra items.

import * as Sentry from "@sentry/nextjs";
import { parseGoogleNewsRss } from "../rss";
import type { NewsItem, NewsProvider, NewsProviderContext } from "../types";

export const googleRssProvider: NewsProvider = {
  id: "google_rss",
  enabled: () => true,
  async fetch(ctx: NewsProviderContext): Promise<NewsItem[]> {
    // B3 usa "ações", US usa "stock"; pequeno tweak ajuda a relevância.
    const term = ctx.isB3
      ? `${ctx.displayTicker} ações`
      : `${ctx.displayTicker} stock`;
    const locale = ctx.isB3
      ? "hl=pt-BR&gl=BR&ceid=BR:pt-419"
      : "hl=en-US&gl=US&ceid=US:en";
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&${locale}`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "finance-app/1.2 (educational portfolio simulator)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        next: { revalidate: 900 },
      });
      if (!res.ok) throw new Error(`Google News RSS respondeu ${res.status}`);
      const xml = await res.text();
      return parseGoogleNewsRss(xml, ctx.limit);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: "news", source: "google_rss" },
        extra: { ticker: ctx.ticker },
      });
      return [];
    }
  },
};
