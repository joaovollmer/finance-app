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
  api/{quote,history,search,fx}/    # endpoints sobre os providers
lib/
  market/{yahoo,bcb,rates,types}.ts
  portfolio/{valuation,fixed_income}.ts
components/
  auth/{AuthShell,LogoutButton}.tsx
  charts/PortfolioChart.tsx
  market/{AssetSearch,PriceChart,OrderForm,BondOrderForm,AssetSummaryPanel}.tsx
  ui/{Card,InfoTooltip,LogoMark,NavLink}.tsx
supabase/migrations/
  0001_init.sql                     # schema + RLS + RPC execute_order
  0002_fx_cash_amount.sql           # cash_amount + execute_order com câmbio
  0003_fixed_income.sql             # holdings RF + execute_fixed_income_buy
```

## Setup local

1. Crie um projeto no [Supabase](https://app.supabase.com) e aplique as
   migrations em ordem (SQL Editor → New Query):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_fx_cash_amount.sql`
   - `supabase/migrations/0003_fixed_income.sql`
2. Em **Authentication → Providers**, habilite "Email" com senha.
3. Copie URL e `anon` key para `.env.local`:

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

## Observabilidade e proteção (v1.1 — Sprint B)

Os endpoints `/api/*` (exceto cron) passam por um rate limiter por IP:

- **Com Upstash Redis** (recomendado em prod): defina
  `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`. Janela deslizante
  de 60 req/min/IP, distribuído entre instâncias.
- **Sem Upstash:** fallback in-memory por instância serverless. OK em dev,
  fraco em prod (cada instância da Vercel mantém seu próprio contador).

Sentry é instalado mas só ativa quando o DSN existe:

- `NEXT_PUBLIC_SENTRY_DSN` (obrigatório pra captura no client)
- `SENTRY_DSN` (server, geralmente o mesmo)
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (opcionais — só pra
  upload de sourcemaps na build)

Sem essas vars, o SDK é no-op e a build prossegue normalmente.

## Plano de ação — pós-1.0

A versão 1.0 fecha o MVP com renda variável + renda fixa simulada. As próximas
fases priorizam **lançar para teste de público**, aprofundar a análise
fundamentalista, ampliar fontes de dados e adicionar predição de preços.

### Fase 1.1 — Lançamento público (semanas 1–2)

- Hospedar em Vercel + Supabase prod, configurar domínio e variáveis.
- Logging/monitoramento (Vercel Analytics + Sentry).
- Rate limiting nos endpoints `/api/*` e cache de cotações.
- Política de privacidade, termos e LGPD básica.
- Snapshot diário da carteira via cron (Vercel Cron) substituindo upsert no
  acesso.
- Smoke tests (Vitest + Playwright) cobrindo fluxos críticos.

### Fase 1.2 — Onboarding flexível e fundamentos (semanas 2–4)

- Onboarding opcional: saldo inicial deixa de ser obrigatório. Sem saldo
  definido, cada compra **incrementa** o patrimônio (modo "deposit-on-buy")
  e a carteira mostra aporte total + valorização separados.
- Aprofundamento fundamentalista por ativo:
  - DRE e balanço resumidos (Yahoo `incomeStatementHistory`,
    `balanceSheetHistory`, `cashflowStatementHistory`).
  - Múltiplos históricos (P/L, P/VP, EV/EBITDA), payout, dívida líquida/EBITDA.
  - Histórico de dividendos, splits e recomendações de analistas.
  - Comparação setorial (peers).
- Notícias do ativo: agregação de manchetes via `yahoo-finance2.search().news`
  + RSS do Google News como fallback, exibidas como cards com hyperlink.

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
