# O Investidor — finance-app

Simulador de carteira de investimentos com dados de mercado reais. O usuário
opera ações, ETFs, renda fixa e títulos públicos com um patrimônio imaginário,
sem risco financeiro. O foco é educacional — leigos aprendem o vocabulário e os
mecanismos do mercado, e usuários avançados testam estratégias.

## Para quem é

- Iniciantes que querem aprender a investir antes de arriscar dinheiro real.
- Estudantes e curiosos do mercado financeiro.
- Professores e especialistas que precisam de uma ferramenta didática.
- Investidores experientes testando estratégias.

A linguagem é acessível ao leigo, mas os dados têm profundidade para o avançado.

## Marco 1.0 — o que está pronto

- **Auth + carteira persistida** com Supabase (Postgres + Auth).
- **Onboarding** com saldo inicial flexível.
- **Renda variável (Yahoo Finance):** busca de ativos B3 + internacionais,
  detalhe com cotação ao vivo, gráfico 1M–5A e formulário de ordem.
  - Search com fallback `.SA`/sem sufixo + `quote` direto, priorizando match
    exato (resolve casos como `PETR4`, `VALE3`).
  - `AssetSummaryPanel` com market cap, P/L, P/VP, LPA, dividend yield, beta,
    faixa 52 semanas, variação 12m, margem líquida, ROE, setor e descrição.
- **Conversão cambial USD→BRL** via PTAX/BCB SGS (cache 30min).
- **Renda fixa simulada** (Tesouro Selic, CDB CDI, IPCA+, Prefixado, Treasuries
  1M/1A/5A/10A) marcada a mercado pelos indexadores correntes.
- **Indicadores macro** (Selic, CDI 252du, IPCA 12m, US Treasury yield curve)
  via BCB SGS + Treasury Fiscal Data.
- **Dashboard `/carteira`** com patrimônio total, P&L, posições de RV e RF,
  gráfico de evolução com snapshot diário.
- **Notícias por ativo** (v1.2 — Sprint C): manchetes ticker-aware
  agregadas de múltiplos providers (Yahoo + Finnhub opcional + Google
  News RSS), com dedupe por URL canônica e título normalizado.
- **Integração Finnhub** (v1.2 — Sprint D): além das notícias,
  consumimos endpoints free do Finnhub e fazemos merge com Yahoo num
  painel **único de fundamentos** — preço-alvo dos analistas, métricas
  financeiras complementares (ROA, payout, dívida/patrimônio, PEG, etc.),
  surpresas de earnings e recomendações consolidadas. Cada métrica
  carrega a fonte (Yahoo, Finnhub ou cálculo derivado) e fórmula via
  tooltip. Quando nem Yahoo nem Finnhub publicam um indicador, o app
  tenta calcular a partir dos demonstrativos (margem bruta =
  lucro bruto ÷ receita, EV/EBITDA, ROE, etc.). Para B3 os adapters
  Finnhub retornam null silenciosamente e o app cai 100% no Yahoo.
  Tudo gated por `FINNHUB_API_KEY` opcional.
- **Onboarding flexível** (v1.2 — Sprint A): saldo inicial deixou de ser
  obrigatório. No modo deposit-on-buy a carteira começa zerada e cada
  compra incrementa o `total_deposited`; o dashboard mostra "Total
  aportado" × "Valorização" em vez de "Saldo em caixa" × "Resultado".
- **Fundamentalismo profundo** (v1.2 — Sprint B): no detalhe do ativo,
  novo painel com tabs de Resultado / Balanço / Caixa / Múltiplos /
  Recomendações (via `quoteSummary` expandido) + comparação setorial
  com peers curados. InfoTooltip redesenhado: posicionamento dinâmico
  (top/bottom), tipografia normal forçada, dispensa em Esc/clique fora.
- **Design system "O Investidor"** (Plus Jakarta Sans, tokens pastéis,
  SectionCard/StatCard/Badge, InfoTooltip com glossário).
- **Build de produção verde** (`npm run build`).

## Stack técnica

- **Frontend / Backend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Banco e auth:** Supabase (Postgres + RLS + RPC)
- **Cotações:** `yahoo-finance2` v3
- **Renda fixa / macro:** BCB SGS, U.S. Treasury Fiscal Data
- **Gráficos:** Recharts • **Validação:** Zod

## Estrutura

```
app/
  page.tsx                          # landing
  (auth)/{login,cadastro}           # auth Supabase
  (app)/                            # área autenticada (middleware)
    onboarding/                     # saldo inicial e cria portfolio
    carteira/                       # dashboard
    mercado/                        # busca + página de renda fixa
    ativo/[ticker]/                 # detalhe + gráfico + OrderForm
  api/{quote,history,search,fx,news}/ # endpoints sobre os providers
lib/
  market/{yahoo,finnhub,aggregate,unified,bcb,rates,peers,http,types}.ts
  market/news/{index,types,rss}.ts + providers/{yahoo,finnhub,google_rss}.ts
  portfolio/{valuation,fixed_income}.ts
components/
  auth/{AuthShell,LogoutButton}.tsx
  charts/PortfolioChart.tsx
  market/{AssetSearch,PriceChart,OrderForm,BondOrderForm,UnifiedFundamentalsPanel,PeersPanel,NewsPanel}.tsx
  ui/{Card,InfoTooltip,LogoMark,NavLink}.tsx
supabase/migrations/
  0001_init.sql                     # schema + RLS + RPC execute_order
  0002_fx_cash_amount.sql           # cash_amount + execute_order com câmbio
  0003_fixed_income.sql             # holdings RF + execute_fixed_income_buy
  0004_bond_asset_class.sql         # amplia asset_class_check para bond_*
  0005_schema_migrations.sql        # tabela _migrations + histórico
  0006_migrations_rls.sql           # RLS em _migrations (nega acesso anon)
  0007_deposit_on_buy.sql           # portfolios.deposit_mode + total_deposited + RPCs adaptadas
instrumentation.ts                  # carrega Sentry server/edge config
sentry.{client,server,edge}.config.ts
```

## Setup local

1. Crie um projeto no [Supabase](https://app.supabase.com) e aplique as
   migrations em ordem (SQL Editor → New Query) — ver
   [Runbook de migrations](#runbook-de-migrations) abaixo.
2. Em **Authentication → Providers**, habilite "Email" com senha.
3. Em **Authentication → URL Configuration**, configure os redirects para
   o fluxo de confirmação de e-mail (sem isso o link de confirmação aponta
   para `http://localhost:3000` e não funciona em outros dispositivos):
   - **Site URL:** a URL pública do app (ex.: `https://o-investidor.vercel.app`)
     ou `http://localhost:3000` em dev.
   - **Redirect URLs:** adicione todas as origens válidas, incluindo
     `http://localhost:3000/auth/confirm`, `https://<seu-dominio>/auth/confirm`
     e cada URL de preview da Vercel (`https://<deploy>-<hash>.vercel.app/auth/confirm`)
     que você queira aceitar — pode usar wildcards
     (`https://*-joaovollmer.vercel.app/auth/confirm`).
4. Copie URL e `anon` key para `.env.local`:

```bash
cp .env.example .env.local
# preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
```

5. Instale e rode:

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`. Crie uma conta, defina o saldo inicial e
comece a operar.

## Testes

Duas camadas, conforme a Sprint C:

```bash
# Unit (Vitest) — funções puras de portfolio/market, < 1s
npm run test
npm run test:watch   # modo watch para desenvolvimento

# E2E (Playwright) — smoke da landing pública
npx playwright install chromium   # 1ª vez, baixa o browser
npm run build                     # E2E roda contra `next start`
npm run test:e2e
```

Em CI, o GitHub Actions (`.github/workflows/ci.yml`) roda lint, typecheck
e unit em cada PR; E2E roda em paralelo mas não bloqueia merge enquanto
a suíte está pequena.

## Observabilidade e proteção (v1.1 — Sprints B + hotfix)

Os endpoints `/api/*` (exceto cron) passam por um rate limiter por IP:

- **Com Upstash Redis** (recomendado em prod): defina
  `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`. Janela deslizante
  de 60 req/min/IP, distribuído entre instâncias.
- **Sem Upstash:** fallback in-memory por instância serverless. OK em dev,
  fraco em prod (cada instância da Vercel mantém seu próprio contador).

Sentry só ativa quando o DSN existe:

- `NEXT_PUBLIC_SENTRY_DSN` (captura no client)
- `SENTRY_DSN` (server, geralmente o mesmo valor)
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (opcionais — só pra
  upload de sourcemaps no build)

Sem DSN, o SDK fica no-op e o build prossegue normalmente.

**`instrumentation.ts` é obrigatório.** Sem ele, o `@sentry/nextjs` v8+
não inicializa o SDK do servidor em Next 14 — Server Components e
route handlers não enviam eventos. O arquivo na raiz importa
`sentry.server.config.ts` e `sentry.edge.config.ts` no runtime certo
e expõe `onRequestError` para Server Components do App Router.

**Erros do Supabase precisam ser capturados manualmente.** A função
`supabase.rpc()` devolve `{ error }` como valor, sem `throw`. A
instrumentação automática não pega esses erros, então `OrderForm` e
`BondOrderForm` chamam `Sentry.captureException(error, …)` no bloco de
erro.

**Smoke test do Sentry:**

```bash
curl -i "https://<deploy>/api/_sentry-check?secret=$CRON_SECRET"
```

Devolve HTTP 500 e o evento aparece em **Sentry > Issues > Feed** em ~10s.
Sem o `?secret=`, o endpoint retorna 401 e não dispara nada — pode
ficar em produção como verificação on-demand.
## Deploy na Vercel

1. **Crie um projeto** em [vercel.com/new](https://vercel.com/new) e conecte
   o repositório `joaovollmer/finance-app`. Use o branch `main`.
2. Em **Project Settings → Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase prod
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave `anon` do mesmo projeto
   - `SUPABASE_SERVICE_ROLE_KEY` — chave `service_role` (apenas servidor —
     usada pelo cron pra bypassar RLS)
   - `CRON_SECRET` — segredo aleatório para autenticar o Vercel Cron.
     Gere com `openssl rand -hex 32`.
3. **Cron diário:** o `vercel.json` na raiz já configura
   `/api/cron/snapshot` rodando às 03:00 UTC todo dia. A primeira execução
   acontece automaticamente após o primeiro deploy bem-sucedido.
4. **Aplicar migrations no Supabase prod** seguindo o
   [Runbook de migrations](#runbook-de-migrations) — ordem importa.
5. Apertar **Deploy**. As builds subsequentes em `main` viram preview/prod
   automáticos.

### Runbook de migrations

As migrations vivem em `supabase/migrations/NNNN_<slug>.sql`, numeradas
em ordem cronológica. Cada arquivo é idempotente onde possível e termina
com um insert em `public._migrations` para deixar o histórico salvo no
banco.

**Para aplicar uma migration nova:**

1. Abra **SQL Editor → New Query** no Supabase.
2. Cole o conteúdo do `.sql` na ordem.
3. **Antes de rodar**, confirme o que já está aplicado:

   ```sql
   select version, applied_at from public._migrations
    order by version;
   ```

4. Rode `Run`. O `insert into _migrations` no fim do arquivo registra
   a aplicação. Se a migration já estava aplicada, o `on conflict do
   nothing` evita duplicidade — só não rode a parte de DDL duas vezes.
5. **Não apague** o conteúdo do editor logo após rodar; deixe pelo
   menos a query de verificação visível para conferir o resultado.

**Bootstrap em um banco já em uso (que rodou 0001-0004 sem rastro):**

1. Aplique apenas `0005_schema_migrations.sql`. O insert dele já
   marca 0001-0005 como aplicadas, alinhando o registro com a
   realidade do banco.
2. Rode a query de verificação acima — deve listar 5 versões.

**Para uma nova migration sua:**

1. Crie `supabase/migrations/00NN_<slug>.sql` com o próximo número.
2. Termine o arquivo com:

   ```sql
   insert into public._migrations(version, notes) values
     ('00NN_<slug>', '<descrição curta>')
   on conflict (version) do nothing;
   ```

3. Aplique seguindo o passo a passo anterior.

> **Por que não o `supabase` CLI?** Ele faz isso de forma automática via
> `supabase db push`, mas exige Docker no fluxo local — overkill para um
> projeto pequeno. A tabela `public._migrations` é compatível e dá pra
> migrar pro CLI depois sem perder o histórico.

### Testando o cron localmente

```bash
# defina CRON_SECRET no .env.local primeiro
curl "http://localhost:3000/api/cron/snapshot?secret=$CRON_SECRET"
```

A resposta lista `total_portfolios`, `succeeded`, `failed` e os IDs.

## Plano de ação — pós-1.0

A versão 1.0 fecha o MVP com renda variável + renda fixa simulada. As próximas
fases priorizam **lançar para teste de público**, aprofundar a análise
fundamentalista, ampliar fontes de dados e adicionar predição de preços.

### Fase 1.1 — Lançamento público (em andamento)

Dividida em sprints, cada uma virando uma branch
`claude/v1.1-<tema>-sprint-<id>`:

- **Sprint A — Deploy + Cron + Analytics** ✅
  - `vercel.json` configurando cron diário 03:00 UTC em `/api/cron/snapshot`.
  - Rota cron protegida por `CRON_SECRET`, usa `service_role` para
    bypass de RLS e itera todos os portfolios.
  - Lógica de valuation extraída para `lib/portfolio/total_value.ts`.
  - Vercel Analytics integrado.
- **Sprint B — Rate limit + Sentry** ✅
  - `lib/ratelimit.ts` com Upstash Redis (slidingWindow 60req/60s) e
    fallback in-memory aplicado nas 4 rotas `/api/*`.
  - Sentry SDK opcional via DSN nas envs.
- **Hotfix pós-merge** ✅
  - Migration `0004` corrigindo `holdings_asset_class_check` para aceitar
    `bond_br/bond_us`.
  - `BondOrderForm` com `step="any"` (resolve bug do step=50).
  - `instrumentation.ts` (faltava — Sentry não inicializava no servidor).
  - `Sentry.captureException` explícito em `OrderForm`/`BondOrderForm`
    para erros de RPC do Supabase.
  - `.env.example` reescrito com placeholders puros.
  - US Treasury com fallback Yahoo (`^IRX/^FVX/^TNX/^TYX`) para quando
    o `fiscaldata.treasury.gov` falhar.
  - Migration `0005` introduzindo `public._migrations` para rastreio.
- **Sprint C — Testes + CI** ✅
  - Vitest: 22 testes cobrindo `lib/portfolio/*` e `lib/market/bcb.ts`.
  - Playwright: smoke da landing pública (heading, /cadastro, /login).
  - GitHub Actions: lint + typecheck + unit em cada PR; E2E no merge.
- **Sprint D — Páginas legais + LGPD básica** ✅
  - `/privacidade` e `/termos` (públicas, acessíveis pelo footer).
  - `Footer` com links de privacidade/termos na landing e na área autenticada.
  - `SimBanner` educacional fixo no topo da área autenticada.
  - Migration `0006`: RLS em `public._migrations` (nega acesso via PostgREST).

### Fase 1.2 — Onboarding flexível e fundamentos (semanas 2–4)

- Onboarding opcional ✅ (Sprint A): saldo inicial deixou de ser obrigatório.
  No modo deposit-on-buy a carteira começa zerada, cada compra incrementa
  `total_deposited` e o dashboard separa "Total aportado" × "Valorização"
  (ver migration `0007_deposit_on_buy.sql`).
- Aprofundamento fundamentalista por ativo ✅ (Sprint B):
  - DRE e balanço resumidos (Yahoo `incomeStatementHistory`,
    `balanceSheetHistory`, `cashflowStatementHistory`).
  - Múltiplos históricos (P/L, P/VP, EV/EBITDA), payout, dívida líquida/EBITDA.
  - Histórico de dividendos, splits e recomendações de analistas.
  - Comparação setorial (peers).
- Notícias do ativo ✅ (Sprint C): refator em providers plugáveis
  (`lib/market/news/`). Suporte a Yahoo + Finnhub + Google News RSS.
  Dedupe por URL canônica + título normalizado. Cada provider declara
  `enabled()` e é pulado silenciosamente quando a config falta.
- Integração Finnhub multi-fonte ✅ (Sprint D — expandida):
  - `lib/market/finnhub.ts` com 7 adapters tipados (quote, profile,
    metric, recommendation, price-target, insider, earnings) gated por
    `FINNHUB_API_KEY` e cache 30min.
  - `lib/market/aggregate.ts` faz merge Yahoo+Finnhub para Quote e
    AssetSummary — Yahoo é fonte primária, Finnhub preenche lacunas.
  - `FinnhubSignalsPanel` mostra preço-alvo dos analistas (com upside
    %), surpresas de earnings, transações de insiders e indicadores
    complementares (ROA, dívida/PL, PEG, liquidez corrente,
    crescimento YoY, performance vs S&P).
  - Cobertura limitada para B3 — adapters retornam null para tickers
    `.SA` e o painel é ocultado.

### Fase 1.3 — Renda fixa e fundos via fontes brasileiras (semanas 4–8)

- **Fundos de investimento (CVM):** ingestão dos arquivos `inf_diario_fi`
  (cotas diárias) + `cad_fi` (cadastro). Worker em Supabase Edge ou GitHub
  Actions para baixar/normalizar e popular tabelas. Busca por CNPJ/nome,
  página de detalhe com rentabilidade, taxa de adm, classe ANBIMA.
- **ANBIMA:** debêntures (preços indicativos), IMA, IDA. Avaliar viabilidade
  via Selenium/scraping educacional vs. parceria.
- **Tesouro Direto real:** preços e taxas diárias do CSV oficial
  (`PrecoTaxaTesouroDireto.csv`) substituindo a aproximação atual por
  indexador.
- **Renda fixa privada (CDB/LCI/LCA):** catálogo simulado por
  emissor/indexador/prazo, com tributação automática (IR regressivo).

### Fase 1.4 — Mercado internacional e macro (semanas 6–10)

- Cripto (CoinGecko): top-200 com cotação, histórico, supply circulante.
- ETFs e ações de outros mercados (LSE, Euronext, TSX) — generalizar o
  detector de currency/exchange do Yahoo.
- Macro adicional:
  - **FRED:** Fed Funds, CPI, Unemployment, GDP, yield curve completa.
  - **World Bank / IMF:** PIB, inflação, dívida/PIB por país.
  - **BCB SGS:** câmbio múltiplas moedas, expectativas Focus.
- Página `/macro` com dashboard global e correlação com a carteira.

### Fase 1.5 — Análise quantitativa e predição (semanas 8–14)

- Métricas da carteira: Sharpe, Sortino, volatilidade, drawdown máximo, beta
  vs. Ibovespa/S&P 500, tracking error.
- Comparação com benchmarks (CDI, IBOV, S&P 500, IPCA, IMA-B).
- **Preditor de preços** como serviço auxiliar (microserviço Python — FastAPI
  no Railway/Fly, ou Supabase Edge com ONNX):
  - Features: retornos, médias móveis, RSI, MACD, volume, dummies de calendário,
    juros e câmbio (BCB), VIX e Fed Funds (FRED).
  - Modelos: baseline ARIMA/Prophet → Random Forest Regressor → XGBoost →
    LSTM curto. Backtest walk-forward com métricas RMSE/MAE/Directional
    Accuracy.
  - Explicabilidade com SHAP por ativo, mostrando quais features mais pesam
    na predição da próxima janela (1d, 5d, 21d).
  - UI: aba "Predição" no detalhe do ativo com banda de confiança e disclaimer
    educacional pesado ("não é recomendação de investimento").

### Fase 1.6 — Qualidade, performance e UX (contínuo)

- Caching agressivo de cotações (Redis/Upstash) com TTL por classe.
- React Server Components + streaming nas páginas pesadas.
- Acessibilidade (WCAG AA), dark mode opcional, mobile-first revisado.
- Glossário central em `/aprender`, expandindo o `InfoTooltip`.
- Bug-fix queue: revisar tipagens do `yahoo-finance2`, edge cases de fuso
  horário em snapshots, recálculo de PM em vendas parciais.

## Memória do agente

Ver [CLAUDE.md](./CLAUDE.md) para contexto técnico e decisões.
