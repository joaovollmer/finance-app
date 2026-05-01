import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBrRates, getUsRates, type FixedIncomeRate } from "@/lib/market/rates";
import { SectionCard } from "@/components/ui/Card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RendaFixaPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [brRates, usRates] = await Promise.all([
    getBrRates().catch(() => [] as FixedIncomeRate[]),
    getUsRates().catch(() => [] as FixedIncomeRate[]),
  ]);

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
          Taxas de referência para títulos públicos e privados — Brasil e EUA
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Brasil"
          subtitle="BCB SGS · Selic, CDI e IPCA"
        >
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
      </div>

      <div className="mt-6 rounded-xl border border-brand-border bg-brand-pastel p-4 text-[13px] text-brand">
        <strong className="font-bold">Sobre os indicadores</strong>
        <p className="mt-1 leading-relaxed">
          Os títulos prefixados travam a taxa no momento da compra. Os
          pós-fixados acompanham um índice (ex.: CDI ou IPCA + spread). Use
          essas referências para comparar rendimento esperado vs. risco e
          decidir o mix entre renda variável e renda fixa.
        </p>
      </div>
    </div>
  );
}

function RateCard({ rate }: { rate: FixedIncomeRate }) {
  return (
    <div className="rounded-xl border border-surface-border-light bg-surface-muted p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
          {rate.name}
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
