// Provedores de renda fixa: indicadores BR (BCB SGS) e americanos.
// Dois caminhos para os yields americanos, em ordem de preferência:
//   1. US Treasury Fiscal Data API (curva oficial, mais ampla).
//   2. Yahoo Finance (^IRX/^FVX/^TNX/^TYX) como fallback — só pega 3M/5Y/10Y/30Y,
//      mas é o canal que já usamos para ações e dispensa qualquer wiring novo.
// Quando ambos falham, devolvemos array vazio (a UI já trata).
//
// O bug que motivou esse arquivo: Vercel/Node às vezes recebe 403 do
// fiscaldata.treasury.gov sem User-Agent. Adicionamos UA e Sentry.captureException
// no caminho de erro para parar de "perder" silenciosamente.

import * as Sentry from "@sentry/nextjs";
import yfDefault from "yahoo-finance2";
import { parseJsonResponse } from "./http";

export interface FixedIncomeRate {
  code: string;
  name: string;
  ratePct: number;
  date: string;
  unit: "annual" | "monthly";
  source: "BCB-SGS" | "US-Treasury" | "Yahoo";
  country: "BR" | "US";
  description: string;
}

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { value: unknown; fetchedAt: number }>();

// =============================================================
// Brasil — BCB SGS
// =============================================================

const BCB_SERIES: Record<
  string,
  {
    name: string;
    series: number;
    unit: "annual" | "monthly";
    annualizeFromDaily?: boolean;
    description: string;
  }
> = {
  selic: {
    name: "Selic Meta",
    series: 432,
    unit: "annual",
    description:
      "Taxa básica de juros definida pelo Copom. Referência para todo o crédito brasileiro.",
  },
  cdi: {
    name: "CDI",
    series: 12,
    unit: "annual",
    annualizeFromDaily: true,
    description:
      "Taxa média dos empréstimos entre bancos. Principal benchmark de renda fixa pós-fixada.",
  },
  ipca: {
    name: "IPCA (12m)",
    series: 433,
    unit: "annual",
    description:
      "Inflação oficial — IPCA acumulado nos últimos 12 meses (IBGE).",
  },
};

async function fetchBcbSeries(seriesId: number, last = 1) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados/ultimos/${last}?formato=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`BCB ${seriesId} respondeu ${res.status}`);
  return parseJsonResponse<{ data: string; valor: string }[]>(
    res,
    `BCB SGS-${seriesId}`
  );
}

async function getBcbRate(code: keyof typeof BCB_SERIES): Promise<FixedIncomeRate> {
  const cached = cache.get(`bcb:${code}`);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.value as FixedIncomeRate;
  }

  const meta = BCB_SERIES[code];
  let value: number;
  let date: string;

  if (meta.annualizeFromDaily) {
    const last = await fetchBcbSeries(meta.series, 1);
    const last1 = last[last.length - 1];
    const daily = Number(last1.valor) / 100;
    value = (Math.pow(1 + daily, 252) - 1) * 100;
    date = last1.data;
  } else if (code === "ipca") {
    const last12 = await fetchBcbSeries(meta.series, 12);
    const acc = last12.reduce((acc, p) => acc * (1 + Number(p.valor) / 100), 1);
    value = (acc - 1) * 100;
    date = last12[last12.length - 1].data;
  } else {
    const last = await fetchBcbSeries(meta.series, 1);
    const last1 = last[last.length - 1];
    value = Number(last1.valor);
    date = last1.data;
  }

  const result: FixedIncomeRate = {
    code,
    name: meta.name,
    ratePct: Number(value.toFixed(2)),
    date,
    unit: meta.unit,
    source: "BCB-SGS",
    country: "BR",
    description: meta.description,
  };
  cache.set(`bcb:${code}`, { value: result, fetchedAt: Date.now() });
  return result;
}

export async function getBrRates(): Promise<FixedIncomeRate[]> {
  const codes = Object.keys(BCB_SERIES) as (keyof typeof BCB_SERIES)[];
  const results = await Promise.all(
    codes.map((c) =>
      getBcbRate(c).catch((err) => {
        Sentry.captureException(err, { tags: { area: "rates", source: "BCB", code: c } });
        return null;
      })
    )
  );
  return results.filter((r): r is FixedIncomeRate => r !== null);
}

// =============================================================
// EUA — Treasury Fiscal Data + Yahoo (fallback)
// =============================================================

interface TreasuryRow {
  record_date: string;
  bc_1month?: string | null;
  bc_3month?: string | null;
  bc_6month?: string | null;
  bc_1year?: string | null;
  bc_2year?: string | null;
  bc_5year?: string | null;
  bc_10year?: string | null;
  bc_30year?: string | null;
}

const TREASURY_FIELDS: Record<
  string,
  { name: string; field: keyof TreasuryRow; description: string }
> = {
  ust_3m: {
    name: "Treasury 3M",
    field: "bc_3month",
    description: "Rendimento anualizado do título de 3 meses do Tesouro dos EUA.",
  },
  ust_1y: {
    name: "Treasury 1A",
    field: "bc_1year",
    description: "Rendimento anualizado do título de 1 ano do Tesouro dos EUA.",
  },
  ust_5y: {
    name: "Treasury 5A",
    field: "bc_5year",
    description: "Rendimento anualizado do título de 5 anos do Tesouro dos EUA.",
  },
  ust_10y: {
    name: "Treasury 10A",
    field: "bc_10year",
    description:
      "Rendimento anualizado do título de 10 anos — referência global de juros longos.",
  },
  ust_30y: {
    name: "Treasury 30A",
    field: "bc_30year",
    description: "Rendimento anualizado do título de 30 anos do Tesouro dos EUA.",
  },
};

async function fetchTreasuryLatest(): Promise<TreasuryRow | null> {
  const cached = cache.get("treasury:latest");
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.value as TreasuryRow;
  }
  const url =
    "https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/daily_treasury_par_yield_curve_rates" +
    "?sort=-record_date&page%5Bsize%5D=1";

  try {
    const res = await fetch(url, {
      // UA explícito — sem isso, o Treasury às vezes responde 403 para
      // requisições de runtimes serverless (Vercel/Node fetch).
      headers: {
        "User-Agent": "finance-app (https://github.com/joaovollmer/finance-app)",
        Accept: "application/json",
      },
      // Cache do Next: revalida a cada 30 min, alinhando com o TTL_MS local.
      next: { revalidate: 1800 },
    });
    if (!res.ok) {
      throw new Error(
        `Treasury respondeu ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`
      );
    }
    const json = await parseJsonResponse<{ data?: TreasuryRow[] }>(
      res,
      "US Treasury Fiscal Data"
    );
    const row = json.data?.[0] ?? null;
    if (row) cache.set("treasury:latest", { value: row, fetchedAt: Date.now() });
    return row;
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "rates", source: "US-Treasury" } });
    return null;
  }
}

function parseRate(raw: string | null | undefined): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function getTreasuryRates(): Promise<FixedIncomeRate[]> {
  const row = await fetchTreasuryLatest();
  if (!row) return [];
  const out: FixedIncomeRate[] = [];
  for (const [code, meta] of Object.entries(TREASURY_FIELDS)) {
    const n = parseRate(row[meta.field]);
    if (n === null) continue;
    out.push({
      code,
      name: meta.name,
      ratePct: Number(n.toFixed(2)),
      date: row.record_date,
      unit: "annual",
      source: "US-Treasury",
      country: "US",
      description: meta.description,
    });
  }
  return out;
}

// Fallback Yahoo: ^IRX (13-week T-bill ≈ 3M), ^FVX (5Y), ^TNX (10Y), ^TYX (30Y).
// Yahoo retorna o yield diretamente em pontos percentuais (ex.: 4.45 = 4,45%).
// Quando a resposta está num formato legado com ratio ×10 (raro hoje), o
// guardrail abaixo divide por 10 para evitar números absurdos no UI.
const YAHOO_TREASURY: Array<{
  code: string;
  symbol: string;
  name: string;
  description: string;
}> = [
  {
    code: "ust_3m",
    symbol: "^IRX",
    name: "Treasury 3M",
    description: "Rendimento anualizado do T-bill de 13 semanas (≈3 meses).",
  },
  {
    code: "ust_5y",
    symbol: "^FVX",
    name: "Treasury 5A",
    description: "Rendimento anualizado do título de 5 anos do Tesouro dos EUA.",
  },
  {
    code: "ust_10y",
    symbol: "^TNX",
    name: "Treasury 10A",
    description:
      "Rendimento anualizado do título de 10 anos — referência global de juros longos.",
  },
  {
    code: "ust_30y",
    symbol: "^TYX",
    name: "Treasury 30A",
    description: "Rendimento anualizado do título de 30 anos do Tesouro dos EUA.",
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yfMod: any = yfDefault;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YahooCtor: any = yfMod?.default ?? yfMod;
const yahoo = new YahooCtor({ suppressNotices: ["yahooSurvey"] });

async function getYahooTreasuryRates(): Promise<FixedIncomeRate[]> {
  const cached = cache.get("yahoo:treasury");
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.value as FixedIncomeRate[];
  }
  const symbols = YAHOO_TREASURY.map((y) => y.symbol);
  let rows: Array<{ symbol?: string; regularMarketPrice?: number; regularMarketTime?: Date }>;
  try {
    rows = (await yahoo.quote(symbols)) as typeof rows;
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "rates", source: "Yahoo" } });
    return [];
  }
  const bySymbol = new Map(rows.map((r) => [r.symbol, r]));
  const today = new Date().toISOString().slice(0, 10);
  const out: FixedIncomeRate[] = [];
  for (const y of YAHOO_TREASURY) {
    const r = bySymbol.get(y.symbol);
    let price = r?.regularMarketPrice;
    if (typeof price !== "number" || !Number.isFinite(price)) continue;
    if (price > 30) price = price / 10; // guardrail para o formato antigo
    out.push({
      code: y.code,
      name: y.name,
      ratePct: Number(price.toFixed(2)),
      date: r?.regularMarketTime
        ? new Date(r.regularMarketTime).toISOString().slice(0, 10)
        : today,
      unit: "annual",
      source: "Yahoo",
      country: "US",
      description: y.description,
    });
  }
  cache.set("yahoo:treasury", { value: out, fetchedAt: Date.now() });
  return out;
}

export async function getUsRates(): Promise<FixedIncomeRate[]> {
  // Tenta o Treasury; se vier vazio, cai pro Yahoo. Quando Treasury volta
  // com a curva completa (1Y também), usamos ele direto e ignoramos Yahoo.
  const treasury = await getTreasuryRates();
  if (treasury.length >= 3) return treasury;
  const yahooRates = await getYahooTreasuryRates();
  // Faz merge preferindo Treasury (oficial) sobre Yahoo no caso de conflito.
  const seen = new Set(treasury.map((r) => r.code));
  for (const y of yahooRates) if (!seen.has(y.code)) treasury.push(y);
  return treasury;
}
