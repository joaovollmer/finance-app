# CLAUDE.md — Memória do Projeto

Este arquivo serve como memória persistente para o agente Claude trabalhando neste repositório. Sempre leia este arquivo no início de uma sessão antes de modificar código.

## Visão Geral

**finance-app** é um simulador de carteira de investimentos. O usuário define uma quantia imaginária e realiza investimentos com dados de mercado em tempo real, sem risco financeiro real. O foco é educacional, atendendo desde leigos até usuários avançados (incluindo professores).

## Audiência

- Iniciantes que querem aprender a investir sem arriscar dinheiro real.
- Investidores experientes querendo testar estratégias.
- Professores e especialistas que precisam de uma ferramenta didática.

A interface e os textos devem ser acessíveis ao leigo, mas os dados devem ter profundidade suficiente para o avançado.

## Funcionalidades-Alvo

- Definição flexível do montante inicial imaginário.
- Compra/venda simulada em múltiplas classes de ativos:
  - Ações (B3 + bolsas internacionais)
  - ETFs / fundos listados
  - Fundos de investimento e previdência
  - Criptomoedas
  - Renda fixa (CDB, LCI, LCA, debêntures)
  - Títulos públicos (Tesouro Direto, Treasuries, bonds)
- Visualização gráfica da rentabilidade histórica da carteira (1 mês até 5 anos).
- Comparação com benchmarks (CDI, Ibovespa, S&P 500, IPCA).
- Detalhamento por ativo: posição, P&L realizado/não realizado, dividendos.

## Fontes de Dados

| Fonte | Uso | Frequência |
|-------|-----|-----------|
| Yahoo Finance | Cotações de ações, ETFs, cripto, índices | Tempo real / intraday |
| FRED (Federal Reserve) | Indicadores macro (juros, inflação) | Diária |
| CVM | Cotas de fundos brasileiros | Diária |
| ANBIMA | Renda fixa, debêntures, IMA | Diária |
| Banco Central (BCB SGS) | CDI, Selic, IPCA, câmbio | Diária |
| CoinGecko (alternativa) | Criptomoedas | Tempo real |

Priorizar APIs gratuitas. Centralizar acesso em uma camada de "data providers" para facilitar troca de fonte.

## Convenções de Desenvolvimento

- **Branch de trabalho:** `claude/consolidate-v1-release-PtynD` (release 1.0).
  Branches anteriores `claude/investment-portfolio-simulator-9ck36` e
  `…-TgkAh` foram consolidadas aqui. Próximas iterações abrem branches
  `claude/<tema>-<id>` a partir desta.
- **Commits:** mensagens descritivas em português, focadas no "porquê". Commits pequenos e frequentes.
- **README.md:** mantém um resumo executivo do estado atual do app. Atualizar a cada marco relevante.
- **Documentação técnica:** comentários no código apenas quando o "porquê" não for óbvio. Nunca explicar o "o quê".
- **Idioma:** UI e documentação em português (pt-BR). Identificadores de código em inglês.

## Roadmap (alto nível)

- **v1.0 — Release de fundação** *(atual)*: ações B3+EUA, conversão FX,
  renda fixa simulada, design system "O Investidor", build verde. Pronto
  para deploy de teste.
- **v1.1 — Lançamento público:** Vercel + Supabase prod, observabilidade,
  rate limit, snapshot via cron, testes automatizados.
- **v1.2 — Onboarding flexível + fundamentalismo profundo:** saldo inicial
  opcional (modo deposit-on-buy), DRE/balanço/cashflow, múltiplos históricos,
  notícias por ativo (yfinance + RSS).
- **v1.3 — Renda fixa real e fundos:** ingestão CVM (`inf_diario_fi`,
  `cad_fi`), Tesouro Direto via CSV oficial, ANBIMA (debêntures, IMA), CDB
  simulado com IR regressivo.
- **v1.4 — Mercado internacional e macro:** cripto (CoinGecko), ETFs e
  bolsas adicionais (LSE, Euronext, TSX), FRED (CPI, GDP, Fed Funds),
  World Bank/IMF, página `/macro`.
- **v1.5 — Análise quantitativa e predição:** Sharpe/Sortino/drawdown,
  benchmarks, microserviço Python para predição (RFR → XGBoost → LSTM)
  com SHAP, backtest walk-forward, UI de previsão por ativo com disclaimer.
- **v1.6 — Qualidade e UX (contínuo):** cache Redis/Upstash, RSC streaming,
  acessibilidade WCAG AA, dark mode, glossário em `/aprender`, fila de
  bug-fix.

## Stack Técnica (decidida)

- **Frontend / Backend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Banco e auth:** Supabase (Postgres + Auth) — login com e-mail/senha
- **Cotações:** `yahoo-finance2` (ações B3 com sufixo `.SA`, EUA puro)
- **Gráficos:** Recharts
- **Validação:** Zod
- **Idioma do MVP:** pt-BR

## Estrutura do Código

```
app/
  page.tsx                     # landing
  (auth)/login,cadastro        # auth com Supabase
  (app)/                       # área autenticada (protegida via middleware)
    layout.tsx                 # header + nav + logout
    onboarding/                # define saldo inicial e cria portfolio
    carteira/                  # dashboard com cards, gráfico de evolução, tabela
    mercado/                   # busca de ativos
    ativo/[ticker]/            # detalhe + gráfico + resumo + OrderForm
  api/{quote,history,search,fx}/ # endpoints sobre os providers (Yahoo, BCB)
lib/
  supabase/{client,server,middleware}.ts
  market/{yahoo,bcb,types}.ts
  portfolio/valuation.ts
components/
  auth/LogoutButton.tsx
  charts/PortfolioChart.tsx
  market/{AssetSearch,PriceChart,OrderForm,AssetSummaryPanel}.tsx
supabase/migrations/0001_init.sql           # schema + RLS + RPC execute_order
supabase/migrations/0002_fx_cash_amount.sql # cash_amount + execute_order com câmbio
supabase/migrations/0003_fixed_income.sql   # holdings RF + execute_fixed_income_buy
middleware.ts                               # protege /(app)/* e atualiza sessão
```

## Estado Atual

- **Fase 0** concluída: scaffolding Next.js, Tailwind, integração Supabase.
- **Fase 1 (MVP)** concluída em código:
  - Cadastro/login com e-mail e senha.
  - Onboarding define saldo inicial e cria `portfolio`.
  - Busca de ativos B3/EUA via Yahoo.
  - Página de detalhe com cotação ao vivo, gráfico 1M–5A e formulário de ordem.
  - Compras/vendas atualizam `holdings`, `cash_balance` e `transactions`
    atomicamente via RPC `execute_order`.
  - Dashboard `/carteira` mostra patrimônio total, P&L, posições e
    evolução com snapshot diário.
- **Fase 2 (em andamento):**
  - Conversão cambial USD→BRL via PTAX do BCB SGS (série 1).
    - Provider: `lib/market/bcb.ts` (`getUsdToBrl`, cache 30min).
    - Endpoint: `app/api/fx/route.ts`.
    - `OrderForm` recebe `fxRate`/`fxDate` quando a moeda do ativo difere da
      carteira. RPC `execute_order` agora aceita `p_cash_amount` (BRL) separado
      de `p_price` (moeda nativa do ativo). Migration
      `0002_fx_cash_amount.sql` adiciona coluna `cash_amount` em
      `transactions` e recria a função.
    - `/carteira` converte posições USD pelo PTAX para o patrimônio total e
      exibe um aviso quando o câmbio não está disponível.
  - Build fix: `serverComponentsExternalPackages: ["yahoo-finance2"]` em
    `next.config.mjs` (a build ESM do pacote contém arquivos de teste com
    `@std/testing/mock`, que o webpack não resolve).
  - **yahoo-finance2 v3**: a default export é a classe `YahooFinance`, então
    `lib/market/yahoo.ts` instancia
    `const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });`
    antes de chamar os métodos. `package.json` fixa `^3.0.0`.
  - Busca de ativos (`searchAssets`) deixou de filtrar por exchange — qualquer
    EQUITY/ETF que o Yahoo devolver é aceito; tickers `.SA` viram `stock_br`,
    o resto vai como `stock_us` (com `currency` real vindo da `quote`).
  - Página `/ativo/[ticker]` usa `getAssetSummary` (`yahooFinance.quoteSummary`,
    módulos `price`/`summaryDetail`/`defaultKeyStatistics`/`summaryProfile`/
    `financialData`) para exibir market cap, P/L, P/VP, LPA, dividend yield,
    beta, faixa de 52 semanas, variação 12m, margem líquida, ROE, setor,
    indústria, site e descrição da empresa via `AssetSummaryPanel`.
  - Tipagem do `yahooFinance.quote()`: a versão mais recente devolve uma
    união discriminada por `quoteType` que o TS resolve para `never` quando o
    símbolo é genérico. `lib/market/yahoo.ts` declara um shape mínimo
    (`RawQuote`/`RawCandle`/`RawSearchQuote`) e faz cast — usamos só campos
    presentes nas variantes equity/ETF.
- Migrations aplicadas em prod: `0001_init.sql` e `0002_fx_cash_amount.sql`.
  `0003_fixed_income.sql` precisa ser rodada antes do release público.
- `npm run build` validado localmente em maio/2026 na branch
  `claude/consolidate-v1-release-PtynD` — todos os 14 routes geraram sem
  erro.

### Marco design system "O Investidor" (maio/2026)

- **Identidade:** rebranding "O Investidor" — logo geométrico (`components/ui/LogoMark.tsx`),
  wordmark, tipografia **Plus Jakarta Sans** carregada via `next/font/google`
  em `app/layout.tsx`.
- **Tokens CSS:** `app/globals.css` define `--brand`, `--brand-pastel`,
  `--positive`, `--negative`, `--text/-muted/-faint`, `--bg`, `--surface`,
  `--border`, `--border-light`. `tailwind.config.ts` mapeia esses tokens para
  `brand`, `positive`, `negative`, `ink`, `surface`.
- **Componentes UI base:** `components/ui/Card.tsx` (`SectionCard`,
  `StatCard`, `Badge`), `components/ui/NavLink.tsx`,
  `components/auth/AuthShell.tsx` (split layout azul + formulário).
- **Telas refeitas:** landing (`app/page.tsx`), login/cadastro (split layout),
  layout autenticado (`app/(app)/layout.tsx` com nav + avatar de iniciais),
  carteira, mercado, ativo, onboarding, OrderForm, AssetSearch, charts.

### Busca de ativos B3 (fix maio/2026)

- `searchAssets` agora dispara busca paralela com e sem sufixo `.SA` quando o
  input casa com o padrão B3 (`/^[A-Z]{4}\d{1,2}$/`), faz dedupe por
  símbolo, e usa `quote()` direto como plano B se nada vier do `/search`. O
  match exato pelo `displayTicker` é priorizado.

### Renda Fixa (fase 2 — maio/2026)

- `lib/market/rates.ts` expõe `getBrRates()` (BCB SGS séries 432 Selic, 12
  CDI anualizado em 252 d.u., 433 IPCA acumulado 12m) e `getUsRates()`
  (US Treasury Fiscal Data — `daily_treasury_yield_curve_rates`, campos
  `bc_1month`/`bc_1year`/`bc_5year`/`bc_10year`).
- Todas as séries com cache de 30 min em memória.
- Página `/mercado/renda-fixa` mostra grid com cards das taxas em duas seções
  (Brasil e EUA) + nota explicativa.
- Compra simulada já existe (migration 0003 + `BondOrderForm` + RPC
  `execute_fixed_income_buy`); marcação a mercado feita pelos indexadores
  correntes em `lib/portfolio/fixed_income.ts`.

### Tesouro / Treasury simulado (v1.0 — maio/2026)

- Migration `0003_fixed_income.sql`: `holdings.indexer`,
  `holdings.index_percent`, `holdings.fixed_rate`, `holdings.maturity_date`,
  `holdings.principal`. RPC `execute_fixed_income_buy` cria a posição e
  abate o caixa numa transação só.
- Catálogo em `app/(app)/mercado/renda-fixa/page.tsx`: Tesouro Selic, CDB
  CDI%, CDB IPCA+, CDB Prefixado, US Treasuries 1M/1A/5A/10A.
- `BondOrderForm` valida principal, taxa e vencimento; `lib/portfolio/
  fixed_income.ts` calcula valor de mercado por classe (pós-fixado: principal
  + acúmulo do indexador no período; prefixado: desconto pela taxa atual).
- `/carteira` mostra tabela separada para títulos de RF, sinalizando o
  marker (Selic/CDI/IPCA/PRE/UST).

## Plano de ação pós-1.0

Detalhamento em [README.md](./README.md#plano-de-ação--pós-10). Resumo:

1. **Lançamento (v1.1):** deploy Vercel+Supabase, monitoramento, rate limit,
   cron de snapshots, smoke tests.
2. **Onboarding flexível + fundamentos (v1.2):** modo deposit-on-buy,
   demonstrativos, múltiplos históricos, notícias por ativo.
3. **Fundos e RF brasileira (v1.3):** ingestão CVM, Tesouro CSV, ANBIMA.
4. **Internacional + macro (v1.4):** CoinGecko, mais bolsas, FRED, World Bank.
5. **Quant + predição (v1.5):** métricas avançadas, microserviço Python com
   RFR/XGBoost/LSTM e SHAP.
6. **Qualidade contínua (v1.6):** cache, RSC streaming, acessibilidade.

## Decisões pendentes

- [ ] Aplicar migration `0003_fixed_income.sql` em prod.
- [ ] Snapshot diário via cron (Vercel Cron) — substitui upsert no acesso.
- [ ] Hospedagem em Vercel + domínio.
- [ ] Testes automatizados (Vitest unit + Playwright E2E).
- [ ] Decidir host do microserviço de predição (Railway / Fly / Supabase Edge).
- [ ] Avaliar caching distribuído (Upstash Redis) para cotações.
