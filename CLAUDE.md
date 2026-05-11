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

## v1.2 — Hotfix auth confirm (maio/2026)

Branch: `claude/v1.2-hotfix-auth-confirm`. Corrige fluxo de confirmação de
e-mail. Sintoma reportado: usuário cria conta, clica no link do e-mail no
celular e recebe `ERR_CONNECTION_FAILED` para `localhost:3000`.

- **Causa raiz dupla:**
  1. `signUp` chamava `supabase.auth.signUp({ email, password })` sem
     `options.emailRedirectTo`. Supabase então usa o `Site URL` configurado
     no dashboard. Como o projeto estava com `Site URL=http://localhost:3000`,
     todo e-mail de confirmação apontava para localhost — quebrado em
     qualquer dispositivo que não fosse a máquina de dev original.
  2. Não havia rota `/auth/confirm` no app. Mesmo se o `Site URL` estivesse
     correto, a troca do `token_hash`/`code` por sessão precisa de um
     handler — sem ele, o link só renderiza a home (sem sessão).
- **Fix de código:**
  - `app/auth/confirm/route.ts`: Route Handler GET que aceita os dois
    fluxos do Supabase (`token_hash` + `type` para o template novo,
    `code` para PKCE) e chama `verifyOtp` / `exchangeCodeForSession`.
    Em sucesso redireciona para `?next=` (default `/auth/welcome`); em
    erro, para `/auth/confirm/erro?reason=<msg>`.
  - `app/auth/welcome/page.tsx`: tela de boas-vindas pós-confirmação com
    AuthShell, ícone ✓ e CTA contextual (`/onboarding` se o usuário ainda
    não criou portfolio, `/carteira` caso contrário). Sem sessão, manda
    pra `/login?confirmed=1` (usuário abriu o link em outro browser).
  - `app/auth/confirm/erro/page.tsx`: estado de falha com explicação
    (links expiram em 24h, só funcionam uma vez) e atalhos para `/login`
    e `/cadastro`.
  - `/cadastro` passa `options.emailRedirectTo: ${origin}/auth/confirm` no
    `signUp` — usa o domínio atual do browser, então funciona em dev,
    preview da Vercel e prod sem trocar config.
  - `/login` aceita `?confirmed=1` e mostra banner "E-mail confirmado".
- **Fix de configuração (operador):** README ganha passo 3 explicando que
  no Supabase **Authentication → URL Configuration** é preciso setar
  `Site URL` para o domínio público e adicionar `…/auth/confirm` à lista
  de Redirect URLs (incluindo wildcards para previews).
- **Sem migration.** Sem mudança de schema.

## v1.2 — Sprint A (onboarding flexível / deposit-on-buy) — maio/2026

Branch: `claude/v1.2-onboarding-flex-sprint-a`. Saldo inicial deixou de ser
obrigatório; quem escolhe o modo "Sob demanda" começa com carteira zerada
e cada compra incrementa o aporte.

- **Migration `0007_deposit_on_buy.sql`:** adiciona `portfolios.deposit_mode`
  (boolean, default false) e `portfolios.total_deposited` (numeric, default
  0). Backfill: para portfolios pré-existentes, `total_deposited =
  initial_cash` (idempotente — só atualiza onde está zerado).
- **RPC `execute_order` adaptada:** quando `deposit_mode=true`, o branch
  de compra consome `cash_balance` disponível primeiro (vendas anteriores)
  e o restante vira aporte novo (`total_deposited += diferença`). Nunca
  falha por "saldo insuficiente". Vendas creditam `cash_balance` em ambos
  modos. Comportamento do modo padrão preservado integralmente.
- **RPC `execute_fixed_income_buy` adaptada:** mesma lógica do
  `execute_order` para deposit_mode. Sem mudança de assinatura.
- **`portfolioBaseline` e `portfolioPnL` (`lib/portfolio/valuation.ts`):**
  funções puras que devolvem `initial_cash` (modo padrão) ou
  `total_deposited` (deposit_mode) como base do P&L do dashboard. Quando
  o aporte é zero, percentual é 0 (carteira recém-criada não mostra "0%
  desde o início" e sim "Faça sua primeira compra").
- **Onboarding (`app/(app)/onboarding/page.tsx`):** dois cards de modo —
  "Saldo inicial" (valor + presets, comportamento atual) e "Sob demanda"
  (insere portfolio com `initial_cash=0`, `cash_balance=0`,
  `deposit_mode=true`).
- **Forms:** `OrderForm` e `BondOrderForm` recebem `depositMode` (default
  false). Em deposit_mode, removem a checagem client-side de "saldo
  insuficiente" e mostram um row "Novo aporte necessário" com a diferença
  entre `cash_amount` e `cash_balance` quando relevante. Páginas
  `/ativo/[ticker]` e `/mercado/renda-fixa` passam `portfolio.deposit_mode
  === true` adiante.
- **Dashboard `/carteira`:** em `deposit_mode`, o segundo card vira "Total
  Aportado" e o terceiro "Valorização" (sufixo "sobre o aporte"). Série
  do gráfico começa em 0 em vez de `initial_cash` para refletir o aporte
  zero inicial. Modo padrão inalterado.
- **Tipos:** `PortfolioRow` ganha `deposit_mode?: boolean` e
  `total_deposited?: number` opcionais (compatível com queries que
  selecionam `*` independentemente de a migration estar aplicada).
- **Testes:** 6 novos casos em `__tests__/portfolio/valuation.test.ts`
  cobrindo `portfolioBaseline` (3 cenários) e `portfolioPnL` (3 cenários).
  Build verde, 34 testes no total.
- **Operacional:** migration `0007` precisa rodar no Supabase prod antes
  do deploy desta sprint, ou todas as queries em `portfolios` falham por
  coluna inexistente. Conferir via `select version from public._migrations
  where version='0007_deposit_on_buy'`.

## v1.2 — Sprint D (pluralização de providers de notícias) — maio/2026

Branch: `claude/v1.2-news-providers-sprint-d`. Estende Sprint C: o módulo
de notícias vira um orquestrador multi-provider com dedupe, em vez de só
Yahoo + fallback Google.

- **Estrutura nova:**
  - `lib/market/news/index.ts` — orquestrador público; mantém `getAssetNews`
    e re-exporta `parseGoogleNewsRss` para compatibilidade com testes.
  - `lib/market/news/types.ts` — `NewsItem`, `NewsProvider`, `NewsSource`
    (`yahoo` | `finnhub` | `google_rss`), `NewsSentiment`.
  - `lib/market/news/rss.ts` — parser do Google News RSS (extraído da
    versão monolítica).
  - `lib/market/news/providers/{yahoo,finnhub,google_rss}.ts` — cada
    provider implementa `NewsProvider`. `enabled()` decide se entra na
    rodada.
- **Orquestração:** todos os providers ativos rodam em paralelo via
  `Promise.allSettled`. Resultado bruto é ordenado por `publishedAt`
  desc e passa pelo dedupe (preserva primeira ocorrência).
- **Dedupe:** `canonicalUrl(url)` remove query string + fragmento +
  trailing slash + força lowercase; `normalizeTitle` tira pontuação e
  espaços extras. Notícias idênticas vindas de fontes diferentes (Yahoo
  e Finnhub publicam a mesma manchete da Reuters, p.ex.) caem para uma
  só.
- **Finnhub:** opcional via `FINNHUB_API_KEY`. Sem chave, `enabled()`
  devolve false e o provider é pulado. Janela de busca: últimos 30
  dias. Pula tickers `.SA` (cobertura B3 fraca).
- **Cache:** mantido em memória, 15min por `(yahooSymbol, limit)` —
  mesmo TTL da Sprint C.
- **Compatibilidade:** assinatura pública (`getAssetNews(ticker, limit)`,
  tipo `NewsItem`) idêntica. Endpoint `/api/news` e `NewsPanel` não
  mudam. `lib/market/news.ts` antigo foi removido — Node resolve
  `lib/market/news` como pasta via `index.ts`.
- **Tipos:** `NewsItem.sentiment` (`positive | neutral | negative`)
  opcional. Hoje só Finnhub poderia populá-lo, mas o endpoint free não
  retorna score — fica `undefined` até integrarmos a versão paga.
- **Testes:** mantemos os 6 originais do parser + 3 de `canonicalUrl` +
  3 de `dedupeNews` = 12 no arquivo. Total: 40 testes verdes.
- **Env:** `.env.example` ganha bloco `FINNHUB_API_KEY=`.
- **Sem migration.**

## v1.2 — Sprint C (notícias por ativo) — maio/2026

Branch: `claude/v1.2-news-sprint-c`. Primeiro entregável da v1.2 (warm-up
de menor escopo, sem migration).

- **`lib/market/news.ts`:** `getAssetNews(ticker, limit=8)` com cache 15min
  em memória. Tenta primeiro `yahooFinance.search(symbol, { newsCount })` —
  normaliza ticker para `.SA` quando casa com padrão B3. Se devolver vazio
  (ou jogar exception), faz fallback para Google News RSS
  (`https://news.google.com/rss/search?q=<displayTicker>+ações&hl=pt-BR&...`).
  Erros das duas fontes são capturados via `Sentry.captureException` com
  tag `area=news,source=yahoo|google_rss` — nunca propagam.
- **Parser RSS in-house:** `parseGoogleNewsRss(xml, limit)` com regex em
  `<item>/<title>/<link>/<pubDate>/<source>` + decode de entidades HTML
  básicas. Evita adicionar `fast-xml-parser` ou similar. Testado.
- **Endpoint `/api/news`:** Zod (`ticker` 1-20 chars, `limit` 1-20),
  `withRateLimit` reaproveitando o limiter existente,
  `Cache-Control: s-maxage=900, stale-while-revalidate=1800`.
- **`NewsPanel` (server component):** lista cards com thumbnail (quando
  Yahoo retorna), título (line-clamp-2), publisher e tempo relativo
  (`Intl.RelativeTimeFormat`). Empty state amigável. Links abrem em nova
  aba com `rel="noopener noreferrer"`.
- **Integração:** `app/(app)/ativo/[ticker]/page.tsx` adiciona
  `getAssetNews(decoded).catch(() => [])` no `Promise.all` existente — não
  bloqueia a página se notícias falharem. Card aparece abaixo de
  Fundamentos.
- **Testes:** `__tests__/market/news.test.ts` (6 testes do parser RSS).
  Build verde, 28 testes no total.
- **Próximas sprints v1.2:** Sprint A (onboarding deposit-on-buy +
  migration 0007) e Sprint B (fundamentalismo profundo via mais módulos
  do `quoteSummary` + peers curados).

## v1.1 — Sprint A (em andamento)

- [x] `vercel.json` com cron diário 03:00 UTC em `/api/cron/snapshot`.
- [x] Rota cron protegida por `CRON_SECRET` (header `Authorization` ou
  query `?secret=` para debug). Usa `SUPABASE_SERVICE_ROLE_KEY` via
  `lib/supabase/admin.ts` para iterar todos os portfolios bypassando RLS.
- [x] Lógica de valuation extraída para `lib/portfolio/total_value.ts`,
  reutilizada por `/carteira` e pelo cron — fim do upsert in-line.
- [x] `@vercel/analytics` integrado no `app/layout.tsx`.
- [ ] Deploy na Vercel + env vars (responsabilidade do operador).
- [ ] Migration `0003_fixed_income.sql` no Supabase prod.

## Pendências subsequentes (Sprint B+)

- [x] Rate limiting `/api/*` (Upstash Ratelimit, fallback in-memory) — Sprint B.
- [x] Sentry SDK com DSN opcional via env — Sprint B.
- [ ] Vitest + Playwright + GitHub Actions CI — **Sprint C** (próxima branch
  `claude/v1.1-tests-sprint-c`).
- [ ] Páginas legais (`/privacidade`, `/termos`) + footer + banner de
  simulação educacional — **Sprint D**.
- [ ] Decidir host do microserviço de predição (Railway / Fly / Supabase Edge).
- [ ] Avaliar caching distribuído (Upstash Redis) para cotações.

## Hotfix v1.1 — pós-merge main (maio/2026)

Branch: `claude/v1.1-hotfix-env-readme`. Corrige bugs descobertos depois que
Sprint A+B caíram em `main`.

### Erro `holdings_asset_class_check` na compra de renda fixa

- **Sintoma:** `BondOrderForm` mostra "new row for relation 'holdings'
  violates check constraint 'holdings_asset_class_check'" ao confirmar
  aplicação.
- **Causa raiz:** migration `0001_init.sql` define
  `check (asset_class in ('stock_br','stock_us'))` em `holdings` e
  `transactions`. Migration `0003_fixed_income.sql` adicionou as RPCs com
  `bond_br`/`bond_us` mas esqueceu de ampliar o check.
- **Fix:** migration `0004_bond_asset_class.sql` faz `drop constraint if
  exists` e recria com o universo `('stock_br','stock_us','bond_br','bond_us')`
  nas duas tabelas. Idempotente. **Precisa rodar no Supabase prod.**

### Input numérico do BondOrderForm rejeitando valores redondos

- **Sintoma:** ao digitar 10000 / 80000 / 100000 no "Valor a investir", o
  browser bloqueia com "Insira um valor válido. Os dois valores válidos
  mais próximos são 9951 e 10001".
- **Causa raiz:** o `<input type="number">` tinha `min={1}` + `step={50}`,
  então a malha de valores válidos era 1, 51, 101, …, 9951, 10001 (offset
  de 1). 10000 fica fora dessa grade e o HTML5 valida no envio.
- **Fix:** `step="any"` + `inputMode="decimal"`. Mantém `min={1}`.

### Sentry capturando 0 erros mesmo com DSN configurado

- **Causa raiz #1 (instrumentation.ts ausente):** `@sentry/nextjs` v8+
  com Next 14 exige um arquivo `instrumentation.ts` na raiz do projeto
  para que `sentry.server.config.ts` e `sentry.edge.config.ts` sejam
  carregados no runtime certo. Sem ele, **o SDK do servidor nunca
  inicializa** — Server Components, route handlers, cron e qualquer
  exceção do Node ficam invisíveis. O sintoma é exatamente o que o
  usuário viu: aba "Issues > Feed" do Sentry mostrando o onboarding
  ("Get Started with Sentry Issues") em vez de eventos. Fix:
  `instrumentation.ts` que faz `await import("./sentry.server.config")`
  para `nodejs` e `./sentry.edge.config` para `edge`, mais
  `export const onRequestError = Sentry.captureRequestError`.
- **Causa raiz #2 (RPC do Supabase devolve erro como valor):** mesmo com
  o SDK ativo, `supabase.rpc()` não faz `throw`. A instrumentação
  automática só captura exceções não tratadas, então erros de RPC
  (constraint, permissão, network) sumiam sem aparecer no Sentry.
- **Fix:** chamada explícita `Sentry.captureException(error, { tags, extra })`
  nos blocos `if (error) { … }` de `OrderForm.tsx` e `BondOrderForm.tsx`,
  com tag `area=stock_order|bond_order` e `extra` com ticker / asset_class.
- **Smoke test:** rota `app/api/_sentry-check/route.ts` lança um erro
  quando chamada com `?secret=<CRON_SECRET>`. Útil para validar o
  wiring sem depender de erro real da app. Não esquecer de remover ou
  proteger antes de release público.
- **Como validar o wiring na Vercel:** `curl -i
  https://<deploy>/api/_sentry-check?secret=<CRON_SECRET>` →
  HTTP 500 + evento aparecendo em Sentry > Issues > Feed em ~10s.
- **Lição arquitetural:** sempre que adotarmos um novo client que não
  faz throw (Supabase, fetch sem `res.ok` check, etc.), instrumentar o
  caminho de erro manualmente.

### `.env.example` — chaves reais residuais

- O commit `70f54b9` ("substitui chaves reais por placeholders") só
  *acrescentou* um bloco de placeholders ao final do arquivo, mantendo as
  JWT reais nas linhas 2-4. O hotfix reescreve o arquivo inteiro com
  apenas placeholders, na ordem: Supabase → CRON_SECRET → Upstash → Sentry.
- **Ação necessária no operador:** rotacionar a `service_role` (e idealmente
  a `anon`) já que estiveram públicas. No painel novo:
  *Project Settings → API Keys → "Publishable and secret API keys"* →
  "Create new secret key" / "Disable" no antigo.
  Para o esquema legado (aba mostrada na imagem do usuário):
  *Settings → JWT Keys → "Roll JWT Secret"* — invalida `anon` e
  `service_role` em massa, e novas chaves são geradas.

### Como validar a migration 0003 no Supabase

Rodar no SQL editor do Supabase:

```sql
-- Colunas da migration 0003 existem em holdings?
select column_name from information_schema.columns
 where table_schema='public' and table_name='holdings'
   and column_name in ('indexer','index_percent','fixed_rate',
                       'purchase_date','maturity_date','principal');
-- Esperado: 6 linhas.

-- A RPC existe?
select proname from pg_proc
 where proname = 'execute_fixed_income_buy';
-- Esperado: 1 linha.

-- Constraint do indexer presente?
select conname from pg_constraint where conname='holdings_indexer_check';
-- Esperado: 1 linha.
```

Se as 3 saídas baterem, 0003 está aplicada — o erro era só o
`asset_class_check` desatualizado, fixado pela 0004.

### US Treasury "Não foi possível carregar dados" (maio/2026)

- **Sintoma:** card "Estados Unidos" da página `/mercado/renda-fixa`
  mostra a mensagem em vermelho de empty state. BCB (BR) carrega normal,
  só o EUA falha.
- **Causa raiz provável:** `api.fiscaldata.treasury.gov` às vezes
  responde 403 para fetches do runtime serverless da Vercel quando o
  request não tem `User-Agent`. Sem captura de erro, o usuário
  via UI vazia.
- **Fix em `lib/market/rates.ts`:**
  1. Adiciona header `User-Agent: finance-app (...)` + `Accept: application/json`.
  2. Troca `cache: "no-store"` por `next: { revalidate: 1800 }` (alinhado
     com o TTL local de 30min).
  3. Captura erros via `Sentry.captureException` com tag
     `area=rates,source=US-Treasury` para parar de "perder" silenciosamente.
  4. Adiciona fallback **Yahoo Finance**: `^IRX` (3M), `^FVX` (5Y),
     `^TNX` (10Y), `^TYX` (30Y). Quando o Treasury devolve menos de 3
     yields, completa com Yahoo. Resultado: a UI sempre mostra ao menos
     4 yields enquanto Yahoo funcionar.
- **Códigos do catálogo:** `ust_1m` foi removido (Yahoo não tem ticker
  equivalente fácil); o catálogo agora é `ust_3m / ust_1y / ust_5y /
  ust_10y / ust_30y`. Atualizar `RATE_GLOSSARY` e `defaultMaturityForCode`
  na página `/mercado/renda-fixa`.

### Tracking de migrations (maio/2026)

- **Problema:** as migrations 0001-0004 foram aplicadas manualmente via
  SQL Editor sem deixar rastro — não dava para responder "essa migration
  já está em prod?" sem inspecionar tabelas/funções uma a uma.
- **Fix:** migration `0005_schema_migrations.sql` cria
  `public._migrations(version text primary key, applied_at timestamptz,
  notes text)` e seeda 0001-0005 com `on conflict do nothing`. Cada
  migration nova daqui pra frente termina com um `insert into
  _migrations(version, notes) values (..., ...) on conflict do nothing`.
- **Bootstrap:** rodar 0005 num banco onde 0001-0004 já existem é seguro
  (a parte DDL é só `create table if not exists`).
- **Workflow alternativo (futuro):** o `supabase` CLI gerencia isso via
  `supabase_migrations.schema_migrations`, mas exige Docker. Coexiste com
  o nosso `_migrations` se decidirmos migrar.
