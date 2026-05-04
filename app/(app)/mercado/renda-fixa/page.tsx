import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBrRates,
  getUsRates,
  type FixedIncomeRate,
} from "@/lib/market/rates";
import { getUsdToBrl } from "@/lib/market/bcb";
import { SectionCard } from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { GLOSSARY } from "@/lib/glossary";
import BondOrderForm, {
  type BondOption,
} from "@/components/market/BondOrderForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RATE_GLOSSARY: Record<string, string> = {
  selic: GLOSSARY.selic,
  cdi: GLOSSARY.cdi,
  ipca: GLOSSARY.ipca,
  ust_1m: GLOSSARY.treasuryYield,
  ust_1y: GLOSSARY.treasuryYield,
  ust_5y: GLOSSARY.treasuryYield,
  ust_10y: GLOSSARY.treasuryYield,
};

export default async function RendaFixaPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: portfolios } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  const portfolio = portfolios?.[0];
  if (!portfolio) redirect("/onboarding");

  const [brRates, usRates] = await Promise.all([
    getBrRates().catch(() => [] as FixedIncomeRate[]),
    getUsRates().catch(() => [] as FixedIncomeRate[]),
  ]);

  const usdBrl =
    portfolio.currency === "BRL"
      ? await getUsdToBrl().catch(() => null)
      : null;

  const catalog = buildCatalog(brRates, usRates);

  return (
    <div>
      <div className="mb-7">
        <h1
          className="text-[22px] font-extrabold text-ink"
          style={{ letterSpacing: "-0.03em" }}
        >
          Renda Fixa
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Taxas de referência e simulação de aplicação em títulos públicos
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <SectionCard title="Brasil" subtitle="BCB SGS · Selic, CDI e IPCA">
            {brRates.length === 0 ? (
              <Empty source="BCB" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {brRates.map((r) => (
                  <RateCard key={r.code} rate={r} />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Estados Unidos"
            subtitle="US Treasury Fiscal Data · Curva de juros"
          >
            {usRates.length === 0 ? (
              <Empty source="US Treasury" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {usRates.map((r) => (
                  <RateCard key={r.code} rate={r} />
                ))}
              </div>
            )}
          </SectionCard>

          <div className="rounded-xl border border-brand-border bg-brand-pastel p-4 text-[13px] text-brand">
            <strong className="font-bold">Sobre os indicadores</strong>
            <p className="mt-1 leading-relaxed">
              Pós-fixados (Selic/CDI) acompanham a taxa atual; prefixados
              travam o juro no momento da compra; IPCA+ paga inflação +
              spread. Nesta simulação, a marcação a mercado é simplificada
              pelo juros compostos da taxa atual.
            </p>
          </div>
        </div>

        <div>
          <SectionCard
            title="Investir"
            subtitle="Aplicação simulada em títulos públicos"
          >
            <BondOrderForm
              portfolioId={portfolio.id}
              portfolioCurrency={portfolio.currency}
              cashBalance={Number(portfolio.cash_balance)}
              catalog={catalog}
              fxRate={usdBrl?.rate}
              fxDate={usdBrl?.date}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function buildCatalog(
  br: FixedIncomeRate[],
  us: FixedIncomeRate[]
): BondOption[] {
  const cdi = br.find((r) => r.code === "cdi");
  const selic = br.find((r) => r.code === "selic");
  const ipca = br.find((r) => r.code === "ipca");

  const today = new Date();
  const yearsFrom = (years: number) => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().slice(0, 10);
  };

  const items: BondOption[] = [];

  if (selic) {
    items.push({
      id: "TESOURO_SELIC",
      label: "Tesouro Selic",
      indexer: "selic",
      indexPercent: 100,
      fixedRate: null,
      currency: "BRL",
      assetClass: "bond_br",
      defaultMaturity: yearsFrom(3),
      description: `Pós-fixado em 100% da Selic (atualmente ${selic.ratePct.toFixed(2)}% a.a.). Liquidez diária.`,
    });
  }
  if (cdi) {
    items.push({
      id: "CDB_100_CDI",
      label: "CDB 100% CDI",
      indexer: "cdi",
      indexPercent: 100,
      fixedRate: null,
      currency: "BRL",
      assetClass: "bond_br",
      defaultMaturity: yearsFrom(2),
      description: `Pós-fixado em 100% do CDI (≈ ${cdi.ratePct.toFixed(2)}% a.a.). Cobertura do FGC até R$ 250 mil.`,
    });
  }
  if (ipca) {
    items.push({
      id: "TESOURO_IPCA_PLUS",
      label: "Tesouro IPCA+ 6%",
      indexer: "ipca",
      indexPercent: null,
      fixedRate: 6,
      currency: "BRL",
      assetClass: "bond_br",
      defaultMaturity: yearsFrom(5),
      description: `Híbrido: paga IPCA + 6% a.a. Protege do poder de compra (IPCA atual ${ipca.ratePct.toFixed(2)}%).`,
    });
  }
  items.push({
    id: "TESOURO_PREFIXADO",
    label: "Tesouro Prefixado 11%",
    indexer: "prefixed",
    indexPercent: null,
    fixedRate: 11,
    currency: "BRL",
    assetClass: "bond_br",
    defaultMaturity: yearsFrom(4),
    description:
      "Trava 11% a.a. até o vencimento. Bom em ciclos de queda de juros, ruim em alta.",
  });

  for (const r of us) {
    items.push({
      id: `${r.code}_BOND`.toUpperCase(),
      label: `${r.name} (Treasury)`,
      indexer: "treasury",
      indexPercent: null,
      fixedRate: r.ratePct,
      currency: "USD",
      assetClass: "bond_us",
      defaultMaturity: defaultMaturityForCode(r.code),
      description: `Título do Tesouro dos EUA com rendimento atual de ${r.ratePct.toFixed(2)}% a.a. em USD.`,
    });
  }

  return items;
}

function defaultMaturityForCode(code: string): string {
  const today = new Date();
  const add = (years: number) => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().slice(0, 10);
  };
  if (code === "ust_1m") {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (code === "ust_1y") return add(1);
  if (code === "ust_5y") return add(5);
  if (code === "ust_10y") return add(10);
  return add(1);
}

function RateCard({ rate }: { rate: FixedIncomeRate }) {
  const tooltip = RATE_GLOSSARY[rate.code];
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
          {rate.name}
          {tooltip && <InfoTooltip content={tooltip} />}
        </span>
        <span className="text-[10px] font-medium text-ink-faint">
          {rate.date}
        </span>
      </div>
      <div
        className="tabular mt-1 text-2xl font-extrabold text-ink"
        style={{ letterSpacing: "-0.02em" }}
      >
        {rate.ratePct.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        % <span className="text-sm font-semibold text-ink-muted">a.a.</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
        {rate.description}
      </p>
    </div>
  );
}

function Empty({ source }: { source: string }) {
  return (
    <p className="rounded-xl border border-negative-border bg-negative-pastel px-3 py-2 text-xs text-negative">
      Não foi possível carregar dados de {source}. Tente novamente em
      instantes.
    </p>
  );
}
