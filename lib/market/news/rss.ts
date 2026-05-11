// Parser simples do RSS do Google News. Compartilhado pelo provider
// `google_rss` e testado isoladamente. Mantemos sem dependência externa
// (regex em vez de fast-xml-parser) porque o formato é estável e o custo
// de adicionar uma lib seria desproporcional.

import type { NewsItem } from "./types";

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

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
