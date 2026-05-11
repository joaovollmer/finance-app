// Lista curada de peers por setor para a comparação setorial da página de
// detalhe. O Yahoo não tem endpoint de peers para B3, então mantemos um mapa
// manual conservador — sempre 4 a 6 tickers por bucket. Heurística:
//
// 1. Tenta resolver pelo `sector` da empresa (vindo do summaryProfile do
//    Yahoo) cruzando com a coluna `sectorKey` da tabela abaixo.
// 2. Se falhar, tenta por industry (ex.: "Banks—Regional").
// 3. Em último caso, devolve lista vazia — o painel mostra empty state.
//
// Importante: o próprio ticker é removido da lista antes de exibir.

export interface PeerBucket {
  /** Chave que usamos no mapa industry→peers. */
  industryKeys: string[];
  /** sector reportado pelo Yahoo. */
  sectorKeys: string[];
  /** Tickers no formato Yahoo (.SA para B3). */
  br: string[];
  us: string[];
}

const BUCKETS: PeerBucket[] = [
  {
    industryKeys: ["banks", "banks—regional", "banks—diversified"],
    sectorKeys: ["financial services", "financial"],
    br: ["ITUB4.SA", "BBDC4.SA", "BBAS3.SA", "SANB11.SA", "BPAC11.SA"],
    us: ["JPM", "BAC", "WFC", "C", "GS"],
  },
  {
    industryKeys: ["oil & gas integrated", "oil & gas e&p", "oil & gas refining & marketing"],
    sectorKeys: ["energy"],
    br: ["PETR4.SA", "PETR3.SA", "PRIO3.SA", "RECV3.SA", "RRRP3.SA"],
    us: ["XOM", "CVX", "COP", "OXY", "EOG"],
  },
  {
    industryKeys: ["steel", "industrial metals & mining", "other industrial metals & mining"],
    sectorKeys: ["basic materials"],
    br: ["VALE3.SA", "CSNA3.SA", "GGBR4.SA", "USIM5.SA", "GOAU4.SA"],
    us: ["NUE", "STLD", "X", "CLF", "RIO"],
  },
  {
    industryKeys: ["beverages—non-alcoholic", "beverages—brewers", "beverages—wineries & distilleries"],
    sectorKeys: ["consumer defensive"],
    br: ["ABEV3.SA", "AMBP3.SA"],
    us: ["KO", "PEP", "MNST", "STZ"],
  },
  {
    industryKeys: ["grocery stores", "discount stores"],
    sectorKeys: ["consumer defensive"],
    br: ["ASAI3.SA", "PCAR3.SA", "CRFB3.SA", "GMAT3.SA"],
    us: ["WMT", "KR", "COST", "TGT"],
  },
  {
    industryKeys: ["specialty retail", "apparel retail", "internet retail"],
    sectorKeys: ["consumer cyclical"],
    br: ["MGLU3.SA", "LREN3.SA", "AMER3.SA", "VIIA3.SA", "ARZZ3.SA"],
    us: ["AMZN", "WMT", "HD", "LOW", "TGT"],
  },
  {
    industryKeys: ["software—infrastructure", "software—application", "information technology services"],
    sectorKeys: ["technology"],
    br: ["TOTS3.SA", "POSI3.SA", "LWSA3.SA"],
    us: ["MSFT", "ORCL", "ADBE", "CRM", "NOW"],
  },
  {
    industryKeys: ["semiconductors"],
    sectorKeys: ["technology"],
    br: [],
    us: ["NVDA", "AMD", "INTC", "QCOM", "AVGO", "TSM"],
  },
  {
    industryKeys: ["consumer electronics"],
    sectorKeys: ["technology"],
    br: [],
    us: ["AAPL", "SONY", "SAMSUNG", "DELL"],
  },
  {
    industryKeys: ["utilities—regulated electric", "utilities—diversified", "utilities—renewable"],
    sectorKeys: ["utilities"],
    br: ["ELET3.SA", "ELET6.SA", "CMIG4.SA", "CPFE3.SA", "ENGI11.SA", "EQTL3.SA"],
    us: ["NEE", "DUK", "SO", "AEP", "EXC"],
  },
  {
    industryKeys: ["telecom services"],
    sectorKeys: ["communication services"],
    br: ["VIVT3.SA", "TIMS3.SA", "OIBR3.SA"],
    us: ["T", "VZ", "TMUS"],
  },
  {
    industryKeys: ["airlines"],
    sectorKeys: ["industrials"],
    br: ["AZUL4.SA", "GOLL4.SA"],
    us: ["DAL", "UAL", "AAL", "LUV"],
  },
  {
    industryKeys: ["aerospace & defense"],
    sectorKeys: ["industrials"],
    br: ["EMBR3.SA"],
    us: ["BA", "LMT", "RTX", "GD", "NOC"],
  },
  {
    industryKeys: ["packaged foods", "farm products"],
    sectorKeys: ["consumer defensive"],
    br: ["BRFS3.SA", "JBSS3.SA", "MRFG3.SA", "BEEF3.SA"],
    us: ["TSN", "HRL", "GIS", "K", "MDLZ"],
  },
  {
    industryKeys: ["real estate services", "real estate—diversified", "reit—residential"],
    sectorKeys: ["real estate"],
    br: ["BRML3.SA", "MULT3.SA", "IGTI11.SA"],
    us: ["AMT", "PLD", "EQIX", "O", "SPG"],
  },
];

function normalize(s: string | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

/** Resolve até 5 peers para um ticker, removendo o próprio. */
export function resolvePeers(input: {
  ticker: string;
  sector?: string;
  industry?: string;
  isB3: boolean;
}): string[] {
  const ticker = input.ticker.toUpperCase();
  const sector = normalize(input.sector);
  const industry = normalize(input.industry);

  let bucket: PeerBucket | undefined;
  if (industry) {
    bucket = BUCKETS.find((b) =>
      b.industryKeys.some((k) => k.toLowerCase() === industry)
    );
  }
  if (!bucket && sector) {
    bucket = BUCKETS.find((b) =>
      b.sectorKeys.some((k) => k.toLowerCase() === sector)
    );
  }
  if (!bucket) return [];

  const pool = input.isB3 ? bucket.br : bucket.us;
  return pool.filter((t) => t.toUpperCase() !== ticker).slice(0, 5);
}
