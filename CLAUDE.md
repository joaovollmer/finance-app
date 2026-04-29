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

## Estado Atual

- Repositório inicializado.
- README e CLAUDE.md preenchidos.
- Stack técnica e scaffolding ainda não definidos — aguardando decisão do usuário.

## Decisões Pendentes

- [ ] Stack frontend (Next.js + React + TypeScript é o default proposto).
- [ ] Estratégia de persistência (localStorage no MVP vs. banco desde o início).
- [ ] Autenticação (necessária? quando?).
- [ ] Hospedagem (Vercel, Netlify, etc.).
