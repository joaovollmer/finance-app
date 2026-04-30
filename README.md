# finance-app

Simulador de carteira de investimentos com dados de mercado em tempo real. O usuário define uma quantia imaginária e pratica investimentos como se fosse na vida real — sem risco financeiro.

## Para quem é

- Iniciantes que querem aprender a investir antes de arriscar dinheiro real.
- Estudantes e curiosos do mercado financeiro.
- Professores e especialistas que precisam de uma ferramenta didática.
- Investidores experientes testando estratégias.

A linguagem é acessível ao leigo, mas os dados têm profundidade para o usuário avançado.

## O que o app oferece (planejado)

- Carteira simulada com saldo inicial flexível definido pelo usuário.
- Compra e venda simulada de:
  - Ações nacionais (B3) e internacionais (NYSE/Nasdaq)
  - ETFs e fundos listados
  - Fundos de investimento e previdência
  - Criptomoedas
  - Renda fixa (CDB, LCI/LCA, debêntures)
  - Títulos públicos (Tesouro Direto, Treasuries, bonds)
- Gráfico de rentabilidade histórica da carteira (1 mês a 5 anos).
- Comparação com benchmarks (CDI, Ibovespa, S&P 500, IPCA).
- Detalhamento por ativo: posição, lucro/prejuízo, dividendos.

## Stack técnica

- **Frontend / Backend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Banco e autenticação:** Supabase (Postgres + Auth)
- **Cotações:** Yahoo Finance (`yahoo-finance2`)
- **Gráficos:** Recharts
- **Validação:** Zod

## Dados de mercado

Integrações planejadas (todas via APIs gratuitas):

| Fonte | Uso |
|-------|-----|
| Yahoo Finance | Ações, ETFs, cripto, índices |
| FRED | Indicadores macroeconômicos |
| CVM | Cotas diárias de fundos brasileiros |
| ANBIMA | Renda fixa, debêntures, IMA |
| Banco Central (BCB SGS) | CDI, Selic, IPCA, câmbio |
| CoinGecko | Criptomoedas (alternativa) |

## Estado atual

| Item | Status |
|------|--------|
| Documentação inicial (README + CLAUDE.md) | ✅ |
| Stack técnica decidida | ✅ |
| Scaffolding do projeto | ✅ |
| Auth + carteira persistida (Supabase) | ✅ |
| MVP de cotação e ordem de ações (B3 + EUA) | ✅ |
| Gráfico de evolução da carteira (1M–5A) | ✅ |
| Aplicar migration em ambiente real | ⏳ |
| Conversão cambial USD→BRL (PTAX/BCB) | ✅ Fase 2 |
| Cripto + renda fixa | ⏳ Fase 2 |

## Roadmap

1. **Fase 0 — Fundação:** stack, scaffolding, estrutura.
2. **Fase 1 — MVP:** ações B3 + internacionais, carteira persistida em Supabase, gráfico de evolução.
3. **Fase 2:** múltiplas classes (ETFs, cripto, renda fixa básica), conversão cambial.
4. **Fase 3:** fundos e previdência (CVM/ANBIMA).
5. **Fase 4:** métricas avançadas (Sharpe, volatilidade, drawdown) e benchmarks.
6. **Fase 5:** conteúdo educacional (tooltips, glossário, modo guiado).

## Setup local

1. Crie um projeto no [Supabase](https://app.supabase.com) e aplique as migrations
   em ordem (SQL Editor → New Query):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_fx_cash_amount.sql`
2. Em **Authentication → Providers**, habilite "Email" com senha.
3. Copie a URL do projeto e a `anon` key para `.env.local`:

```bash
cp .env.example .env.local
# preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4. Instale e rode:

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`. Crie uma conta, defina o saldo inicial e
comece a operar.

## Desenvolvimento

Branch ativa: `claude/investment-portfolio-simulator-9ck36`.

Memória persistente do projeto: [CLAUDE.md](./CLAUDE.md).
