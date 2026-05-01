// Provedores de renda fixa: indicadores BR (BCB SGS) e americanos (US
// Treasury Fiscal Data API). Centralizamos as duas fontes aqui para que a UI
// trate ambas como "FixedIncomeRate" — sem precisar conhecer cada API.

export interface FixedIncomeRate {
  code: string;
  name: string;
  ratePct: number; // taxa anual em pontos percentuais (ex: 10.5)
  date: string;
  unit: "annual" | "monthly";
  source: "BCB-SGS" | "US-Treasury";
  country: "BR" | "US";
  description: string;
}

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { value: FixedIncomeRate; fetchedAt: number }>();

// BCB SGS — séries oficiais, formato JSON: [{ data: "dd/mm/yyyy", valor: "..." }, ...]
// 432 = Selic meta % a.a.; 12 = CDI % a.d. (anualizar); 433 = IPCA % a.m.
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
  return (await res.json()) as { data: string; valor: string }[];
}

async function getBcbRate(code: keyof typeof BCB_SERIES): Promise<FixedIncomeRate> {
  const cached = cache.get(`bcb:${code}`);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.value;

  const meta = BCB_SERIES[code];
  let value: number;
  let date: string;

  if (meta.annualizeFromDaily) {
    // CDI vem em % ao dia. Anualizamos com base em 252 dias úteis.
    const last = await fetchBcbSeries(meta.series, 1);
    const last1 = last[last.length - 1];
    const daily = Number(last1.valor) / 100;
    value = (Math.pow(1 + daily, 252) - 1) * 100;
    date = last1.data;
  } else if (code === "ipca") {
    // IPCA da SGS é mensal; somamos os últimos 12 meses
    const last12 = await fetchBcbSeries(meta.series, 12);
    const acc = last12.reduce(
      (acc, p) => acc * (1 + Number(p.valor) / 100),
      1
    );
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

// US Treasury Fiscal Data — endpoint público "Daily Treasury Par Yield Curve Rates".
// Doc: https://fiscaldata.treasury.gov/datasets/daily-treasury-par-yield-curve-rates/
// Os campos são "bc_1month", "bc_3month", "bc_1year", "bc_10year" etc.
const TREASURY_FIELDS: Record<
  string,
  { name: string; field: string; description: string }
> = {
  ust_1m: {
    name: "Treasury 1M",
    field: "bc_1month",
    description: "Rendimento anualizado do título de 1 mês do Tesouro dos EUA.",
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
};

interface TreasuryRow {
  record_date: string;
  bc_1month?: string;
  bc_3month?: string;
  bc_6month?: string;
  bc_1year?: string;
  bc_2year?: string;
  bc_5year?: string;
  bc_10year?: string;
  bc_30year?: string;
}

async function fetchTreasuryLatest(): Promise<TreasuryRow | null> {
  const cached = cache.get("treasury:latest");
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return (cached.value as unknown as { row: TreasuryRow }).row;
  }
  const url =
    "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/daily_treasury_yield_curve_rates" +
    "?sort=-record_date&page[size]=1";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Treasury respondeu ${res.status}`);
  const json = (await res.json()) as { data?: TreasuryRow[] };
  const row = json.data?.[0] ?? null;
  if (row) {
    cache.set("treasury:latest", {
      value: { row } as unknown as FixedIncomeRate,
      fetchedAt: Date.now(),
    });
  }
  return row;
}

async function getTreasuryRate(
  code: keyof typeof TREASURY_FIELDS
): Promise<FixedIncomeRate | null> {
  const row = await fetchTreasuryLatest();
  if (!row) return null;
  const meta = TREASURY_FIELDS[code];
  const raw = row[meta.field as keyof TreasuryRow];
  if (raw === undefined || raw === null || raw === "") return null;
  const ratePct = Number(raw);
  if (!Number.isFinite(ratePct)) return null;
  return {
    code,
    name: meta.name,
    ratePct: Number(ratePct.toFixed(2)),
    date: row.record_date,
    unit: "annual",
    source: "US-Treasury",
    country: "US",
    description: meta.description,
  };
}

export async function getBrRates(): Promise<FixedIncomeRate[]> {
  const codes = Object.keys(BCB_SERIES) as (keyof typeof BCB_SERIES)[];
  const results = await Promise.all(
    codes.map((c) => getBcbRate(c).catch(() => null))
  );
  return results.filter((r): r is FixedIncomeRate => r !== null);
}

export async function getUsRates(): Promise<FixedIncomeRate[]> {
  const codes = Object.keys(TREASURY_FIELDS) as (keyof typeof TREASURY_FIELDS)[];
  const results = await Promise.all(
    codes.map((c) => getTreasuryRate(c).catch(() => null))
  );
  return results.filter((r): r is FixedIncomeRate => r !== null);
}
