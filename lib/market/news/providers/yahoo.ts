// Provider Yahoo Finance — primeiro porto de atendimento para news ticker-aware.
// Usa `yahooFinance.search(symbol, { newsCount })` que devolve manchetes da
// `news` interna do Yahoo (já com thumbnail e publisher normalizado).

import * as Sentry from "@sentry/nextjs";
import yfDefault from "yahoo-finance2";
import type { NewsItem, NewsProvider, NewsProviderContext } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yfMod: any = yfDefault;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YahooFinanceCtor: any = yfMod?.default ?? yfMod;
const yahooFinance = new YahooFinanceCtor({
  suppressNotices: ["yahooSurvey"],
});

type RawYahooNews = {
  uuid?: string;
  title?: string;
  link?: string;
  publisher?: string;
  providerPublishTime?: number | Date;
  thumbnail?: { resolutions?: { url?: string; width?: number }[] };
};

export const yahooProvider: NewsProvider = {
  id: "yahoo",
  enabled: () => true,
  async fetch(ctx: NewsProviderContext): Promise<NewsItem[]> {
    try {
      const res = (await yahooFinance.search(ctx.yahooSymbol, {
        quotesCount: 0,
        newsCount: ctx.limit,
      })) as { news?: RawYahooNews[] };

      return (res.news ?? [])
        .filter((n) => n.title && n.link)
        .map((n) => {
          const ts =
            n.providerPublishTime instanceof Date
              ? n.providerPublishTime.getTime()
              : typeof n.providerPublishTime === "number"
                ? n.providerPublishTime * 1000
                : Date.now();
          const thumb = n.thumbnail?.resolutions?.[0]?.url;
          return {
            title: n.title!,
            link: n.link!,
            publisher: n.publisher ?? "Yahoo Finance",
            publishedAt: new Date(ts).toISOString(),
            thumbnail: thumb,
            source: "yahoo" as const,
          };
        });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: "news", source: "yahoo" },
        extra: { ticker: ctx.ticker },
      });
      return [];
    }
  },
};
