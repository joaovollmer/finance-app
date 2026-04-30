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

- **Branch de trabalho:** `claude/investment-portfolio-simulator-9ck36`. Todo desenvolvimento ocorre nesta branch.
- **Commits:** mensagens descritivas em português, focadas no "porquê". Commits pequenos e frequentes.
- **README.md:** mantém um resumo executivo do estado atual do app. Atualizar a cada marco relevante.
- **Documentação técnica:** comentários no código apenas quando o "porquê" não for óbvio. Nunca explicar o "o quê".
- **Idioma:** UI e documentação em português (pt-BR). Identificadores de código em inglês.

## Roadmap (alto nível)

1. **Fase 0 — Fundação** *(em andamento)*: definição de stack, scaffolding, estrutura de pastas.
2. **Fase 1 — MVP de ações:** buscar cotações, simular compra/venda de ações, persistir carteira local, gráfico de evolução.
3. **Fase 2 — Múltiplas classes:** ETFs, cripto, renda fixa básica.
4. **Fase 3 — Fundos e previdência:** integração CVM/ANBIMA.
5. **Fase 4 — Análise avançada:** benchmarks, métricas (Sharpe, volatilidade, drawdown), exportação.
6. **Fase 5 — Conteúdo educacional:** tooltips explicativos, glossário, modo "guiado".

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
- Migrations aplicadas: `0001_init.sql` e `0002_fx_cash_amount.sql` foram
  rodadas no projeto Supabase (abril/2026).
- Falta: validar `npm run build` no ambiente do usuário após o pull das
  últimas mudanças.

## Decisões Adiadas (Fase 2+)

- [x] Conversão cambial (BCB SGS) para ativos USD na carteira BRL.
- [ ] Snapshot diário via cron em vez de upsert no acesso.
- [ ] Cripto (CoinGecko) e renda fixa básica.
- [ ] Hospedagem (Vercel + Supabase é o caminho natural).
- [ ] Testes automatizados (Vitest na Fase 2).
