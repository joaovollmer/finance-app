// Câmbio do Banco Central do Brasil (SGS).
// Série 1 = dólar comercial (venda) PTAX. Resposta JSON: [{ data: 'dd/mm/yyyy', valor: '5.0123' }, ...]

const SGS_LAST_USD = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json";

// O BCB não publica PTAX em fins de semana/feriados, então a última cotação publicada
// pode ter alguns dias. Cacheamos por 30min para não martelar a API a cada request.
const TTL_MS = 30 * 60 * 1000;
let cache: { rate: number; date: string; fetchedAt: number } | null = null;

export interface FxRate {
  pair: "USDBRL";
  rate: number;
  date: string;
  source: "BCB-PTAX";
}

export async function getUsdToBrl(): Promise<FxRate> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return { pair: "USDBRL", rate: cache.rate, date: cache.date, source: "BCB-PTAX" };
  }

  const res = await fetch(SGS_LAST_USD, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`BCB respondeu ${res.status}`);
  }
  const json = (await res.json()) as { data: string; valor: string }[];
  const last = json[json.length - 1];
  if (!last) throw new Error("BCB sem dados");

  const rate = Number(last.valor);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("BCB retornou taxa inválida");
  }

  cache = { rate, date: last.data, fetchedAt: now };
  return { pair: "USDBRL", rate, date: last.data, source: "BCB-PTAX" };
}

export function convertToBrl(amount: number, currency: string, usdBrl: number): number {
  if (currency === "BRL") return amount;
  if (currency === "USD") return amount * usdBrl;
  return amount;
}
