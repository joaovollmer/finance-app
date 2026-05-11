// Orquestrador de notícias multi-provider (Sprint v1.2-D).
//
// Ordem da pluralização:
//   1. Yahoo (ticker-aware, sem chave, cobertura global)
//   2. Finnhub (US-focado, requer FINNHUB_API_KEY, pulado para B3)
//   3. Google News RSS (sempre habilitado, fallback genérico)
//
// Roda os providers em paralelo, depois agrega e dedupa por URL
// canonicalizada (sem query params) e título normalizado. Cache de 15min
// por (ticker, limit) em memória.

import type { NewsItem, NewsProviderContext } from "./types";
import { yahooProvider } from "./providers/yahoo";
import { finnhubProvider } from "./providers/finnhub";
import { googleRssProvider } from "./providers/google_rss";

export type { NewsItem, NewsSource, NewsSentiment } from "./types";
export { parseGoogleNewsRss } from "./rss";

const PROVIDERS = [yahooProvider, finnhubProvider, googleRssProvider];

const TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { items: NewsItem[]; fetchedAt: number }>();

const B3_SUFFIX = ".SA";

function normalizeContext(ticker: string, limit: number): NewsProviderContext {
  const raw = ticker.trim().toUpperCase();
  let yahooSymbol = raw;
  let displayTicker = raw;
  let isB3 = false;

  if (raw.endsWith(B3_SUFFIX)) {
    yahooSymbol = raw;
    displayTicker = raw.slice(0, -B3_SUFFIX.length);
    isB3 = true;
  } else if (/^[A-Z]{4}\d{1,2}$/.test(raw)) {
    yahooSymbol = `${raw}${B3_SUFFIX}`;
    isB3 = true;
  }

  return { ticker, yahooSymbol, displayTicker, isB3, limit };
}

// Canonicaliza URL: remove query string e fragmentos (params de tracking).
// Falha silenciosamente para URLs malformadas — usa o original.
export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.toLowerCase().replace(/\/+$/, "");
  } catch {
    return url.toLowerCase();
  }
}

// Normaliza título para dedupe: lowercase, strip de pontuação leve.
function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeNews(items: NewsItem[]): NewsItem[] {
  const out: NewsItem[] = [];
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();

  for (const item of items) {
    const url = canonicalUrl(item.link);
    const title = normalizeTitle(item.title);
    if (seenUrl.has(url) || seenTitle.has(title)) continue;
    seenUrl.add(url);
    seenTitle.add(title);
    out.push(item);
  }
  return out;
}

export async function getAssetNews(
  ticker: string,
  limit = 8
): Promise<NewsItem[]> {
  const ctx = normalizeContext(ticker, limit);
  const cacheKey = `${ctx.yahooSymbol}:${limit}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return cached.items;
  }

  // Cada provider pede `limit` itens. O total bruto pode ser limit×3
  // antes do dedupe; cortamos no final.
  const active = PROVIDERS.filter((p) => p.enabled());
  const settled = await Promise.allSettled(active.map((p) => p.fetch(ctx)));

  const all: NewsItem[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // Mais recentes primeiro. Dedupe preserva a primeira ocorrência, então
  // ordenamos antes para favorecer items frescos.
  all.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const deduped = dedupeNews(all).slice(0, limit);

  cache.set(cacheKey, { items: deduped, fetchedAt: now });
  return deduped;
}
