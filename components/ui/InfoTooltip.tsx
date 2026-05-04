"use client";

import { useState, type ReactNode } from "react";

// Tooltip educacional com gatilho "?". Hover (desktop) e clique (mobile)
// alternam a exibição. Mantemos posicionamento absoluto simples — sem libs
// pesadas — porque os textos são curtos e os ícones têm contexto local.

export default function InfoTooltip({
  content,
  size = 14,
  className = "",
}: {
  content: ReactNode;
  size?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-label="Mais informações"
        className="flex items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-ink-faint transition hover:bg-brand-pastel hover:text-brand"
        style={{ width: size, height: size, lineHeight: 1 }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-60 -translate-x-1/2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-[11px] font-normal leading-relaxed text-ink shadow-card"
        >
          {content}
        </span>
      )}
    </span>
  );
}

// Glossário central — uma fonte de verdade para os textos curtos. Mantém os
// componentes desacoplados do conteúdo educacional e facilita revisão.
export const GLOSSARY = {
  marketCap:
    "Valor total de mercado da empresa: cotação atual × número de ações em circulação.",
  trailingPE:
    "Preço sobre lucro dos últimos 12 meses. Mede quantos anos de lucro atual seriam necessários pra pagar o preço da ação.",
  forwardPE:
    "P/L projetado: preço dividido pelo lucro estimado para os próximos 12 meses.",
  priceToBook:
    "Preço sobre valor patrimonial. Compara o preço de mercado com o valor contábil — abaixo de 1 sugere desconto.",
  trailingEps:
    "Lucro por ação (LPA) acumulado nos últimos 12 meses. Quanto a empresa lucrou para cada ação emitida.",
  dividendYield:
    "Dividendos pagos nos últimos 12 meses dividido pelo preço atual. Renda esperada se os pagamentos se mantiverem.",
  beta:
    "Volatilidade da ação em relação ao índice. Beta 1 = oscila como o mercado; >1 mais agressiva; <1 mais defensiva.",
  fiftyTwoWeekRange:
    "Menor e maior cotação registrada nos últimos 12 meses (52 semanas).",
  fiftyTwoWeekChangePercent:
    "Variação percentual da ação nos últimos 12 meses.",
  averageVolume:
    "Quantidade média diária de papéis negociados. Volume alto = mais liquidez para entrar e sair.",
  profitMargins:
    "Margem líquida — porcentagem da receita que vira lucro depois de todas as despesas e impostos.",
  returnOnEquity:
    "ROE: lucro líquido dividido pelo patrimônio. Mede quanto a empresa rende sobre o capital dos acionistas.",
  selic:
    "Taxa básica de juros do Brasil definida pelo Copom. Referência para todo crédito e renda fixa pós-fixada.",
  cdi:
    "Taxa média dos empréstimos entre bancos. Principal benchmark de renda fixa pós-fixada (CDB, LCI, fundos DI).",
  ipca:
    "Inflação oficial do Brasil (IBGE). Usado em títulos atrelados à inflação como Tesouro IPCA+ e debêntures incentivadas.",
  treasuryYield:
    "Rendimento anual de um título do Tesouro dos EUA até o vencimento. Referência mundial de juros sem risco em dólar.",
} as const;
