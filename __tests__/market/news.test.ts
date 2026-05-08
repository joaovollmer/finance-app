import { describe, expect, it } from "vitest";
import { parseGoogleNewsRss } from "@/lib/market/news";

describe("parseGoogleNewsRss", () => {
  const sample = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Petrobras anuncia novos dividendos</title>
      <link>https://news.google.com/articles/abc123</link>
      <pubDate>Mon, 05 May 2026 14:30:00 GMT</pubDate>
      <source url="https://valor.com.br">Valor Econômico</source>
    </item>
    <item>
      <title>Ações da PETR4 sobem 3% após resultado</title>
      <link>https://news.google.com/articles/def456</link>
      <pubDate>Tue, 06 May 2026 09:15:00 GMT</pubDate>
      <source url="https://infomoney.com.br">InfoMoney</source>
    </item>
    <item>
      <title>Análise &amp; perspectiva do setor</title>
      <link>https://news.google.com/articles/ghi789</link>
      <pubDate>Wed, 07 May 2026 12:00:00 GMT</pubDate>
      <source url="https://example.com">Example News</source>
    </item>
  </channel>
</rss>`;

  it("extrai todos os items do feed", () => {
    const items = parseGoogleNewsRss(sample, 10);
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe("Petrobras anuncia novos dividendos");
    expect(items[0].link).toBe("https://news.google.com/articles/abc123");
    expect(items[0].publisher).toBe("Valor Econômico");
    expect(items[0].source).toBe("google_rss");
  });

  it("respeita o limite", () => {
    const items = parseGoogleNewsRss(sample, 2);
    expect(items).toHaveLength(2);
  });

  it("decodifica entidades HTML no título", () => {
    const items = parseGoogleNewsRss(sample, 10);
    expect(items[2].title).toBe("Análise & perspectiva do setor");
  });

  it("converte pubDate para ISO 8601", () => {
    const items = parseGoogleNewsRss(sample, 10);
    expect(items[1].publishedAt).toBe("2026-05-06T09:15:00.000Z");
  });

  it("devolve array vazio para XML sem items", () => {
    const items = parseGoogleNewsRss(
      "<rss><channel></channel></rss>",
      10
    );
    expect(items).toEqual([]);
  });

  it("ignora item sem title ou link", () => {
    const broken = `<rss><channel>
      <item><title>Sem link</title><pubDate>Mon, 05 May 2026 14:30:00 GMT</pubDate></item>
      <item><link>https://x.com/a</link><pubDate>Mon, 05 May 2026 14:30:00 GMT</pubDate></item>
      <item><title>OK</title><link>https://x.com/b</link><pubDate>Mon, 05 May 2026 14:30:00 GMT</pubDate></item>
    </channel></rss>`;
    const items = parseGoogleNewsRss(broken, 10);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("OK");
  });
});
