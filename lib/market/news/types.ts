// Tipos compartilhados pelos providers de notícias (Sprint v1.2-D).
//
// O orquestrador `getAssetNews` consulta múltiplas fontes em paralelo,
// dedupa por URL canônica e fundi resultados — cada fonte é um Provider
// que respeita esta interface.

export type NewsSource =
  | "yahoo"
  | "finnhub"
  | "google_rss";

export type NewsSentiment = "positive" | "neutral" | "negative";

export interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
  thumbnail?: string;
  source: NewsSource;
  /** Disponível quando a fonte original publica análise de sentimento. */
  sentiment?: NewsSentiment;
}

export interface NewsProviderContext {
  /** Ticker original passado pelo usuário (antes da normalização). */
  ticker: string;
  /** Símbolo no formato Yahoo (com `.SA` para B3). */
  yahooSymbol: string;
  /** Ticker "limpo" (sem `.SA`). */
  displayTicker: string;
  /** B3 quando o ticker casa com o padrão XXXX[3-8]. */
  isB3: boolean;
  /** Quantos itens cada provider deve idealmente retornar. */
  limit: number;
}

export interface NewsProvider {
  id: NewsSource;
  /** Quando false, o provider é pulado (config ausente, fonte fora do ar etc.). */
  enabled(): boolean;
  fetch(ctx: NewsProviderContext): Promise<NewsItem[]>;
}
