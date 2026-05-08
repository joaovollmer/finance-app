import * as Sentry from "@sentry/nextjs";
import yfDefault from "yahoo-finance2";

export interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
  thumbnail?: string;
  source: "yahoo" | "google_rss";
}

const TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { items: NewsItem[]; fetchedAt: number }>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yfMod: any = yfDefault;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YahooFinanceCtor: any = yfMod?.default ?? yfMod;
const yahooFinance = new YahooFinanceCtor({
  suppressNotices: ["yahooSurvey"],
});

const B3_SUFFIX = ".SA";

function normalizeForYahoo(ticker: string): string {
  const raw = ticker.trim().toUpperCase();
  if (raw.endsWith(B3_SUFFIX)) return raw;
  if (/^[A-Z]{4}\d{1,2}$/.test(raw)) return `${raw}${B3_SUFFIX}`;
  return raw;
}

function displayTickerOf(ticker: string): string {
  const raw = ticker.trim().toUpperCase();
  return raw.endsWith(B3_SUFFIX) ? raw.slice(0, -B3_SUFFIX.length) : raw;
}

type RawYahooNews = {
  uuid?: string;
  title?: string;
  link?: string;
  publisher?: string;
  providerPublishTime?: number | Date;
  thumbnail?: { resolutions?: { url?: string; width?: number }[] };
};

async function fetchYahooNews(
  ticker: string,
  limit: number
): Promise<NewsItem[]> {
  const symbol = normalizeForYahoo(ticker);
  const res = (await yahooFinance.search(symbol, {
    quotesCount: 0,
    newsCount: limit,
  })) as { news?: RawYahooNews[] };

  const news = res.news ?? [];
  return news
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
}

// Parser simples do RSS do Google News. O formato tem `<item>` com `<title>`,
// `<link>`, `<pubDate>` e `<source>`. Suficiente para a fonte estável que
// usamos. Quando o Yahoo falha, isso garante que o usuário não fica com a
// seção vazia.
export function parseGoogleNewsRss(xml: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  const titleRe = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
  const linkRe = /<link>([\s\S]*?)<\/link>/;
  const dateRe = /<pubDate>([\s\S]*?)<\/pubDate>/;
  const sourceRe = /<source[^>]*>([\s\S]*?)<\/source>/;

  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const title = titleRe.exec(block)?.[1]?.trim();
    const link = linkRe.exec(block)?.[1]?.trim();
    if (!title || !link) continue;

    const pubDateRaw = dateRe.exec(block)?.[1]?.trim();
    const publisher = sourceRe.exec(block)?.[1]?.trim() ?? "Google News";
    const publishedAt = pubDateRaw
      ? new Date(pubDateRaw).toISOString()
      : new Date().toISOString();

    items.push({
      title: decodeEntities(title),
      link,
      publisher: decodeEntities(publisher),
      publishedAt,
      source: "google_rss",
    });
  }

  return items;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

async function fetchGoogleNews(
  ticker: string,
  limit: number
): Promise<NewsItem[]> {
  const display = displayTickerOf(ticker);
  const query = encodeURIComponent(`${display} ações`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "finance-app/1.2 (educational portfolio simulator)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    next: { revalidate: 900 },
  });
  if (!res.ok) {
    throw new Error(`Google News RSS respondeu ${res.status}`);
  }
  const xml = await res.text();
  return parseGoogleNewsRss(xml, limit);
}

export async function getAssetNews(
  ticker: string,
  limit = 8
): Promise<NewsItem[]> {
  const key = `${normalizeForYahoo(ticker)}:${limit}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return cached.items;
  }

  let items: NewsItem[] = [];
  try {
    items = await fetchYahooNews(ticker, limit);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "news", source: "yahoo" },
      extra: { ticker },
    });
  }

  if (items.length === 0) {
    try {
      items = await fetchGoogleNews(ticker, limit);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: "news", source: "google_rss" },
        extra: { ticker },
      });
    }
  }

  cache.set(key, { items, fetchedAt: now });
  return items;
}
