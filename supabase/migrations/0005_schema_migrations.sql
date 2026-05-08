-- finance-app — rastreamento manual de migrations.
-- Antes desta migration, cada migration era colada à mão no SQL Editor e
-- não havia registro do que foi aplicado. A partir daqui, cada migration
-- nova termina com um `insert into _migrations(version)` para deixar
-- o histórico salvo no banco — assim dá pra responder "essa migration
-- já foi aplicada em prod?" com uma query.
--
-- Esta tabela é mantida no schema `public` por simplicidade (basta abrir
-- o Table Editor para olhar). Para um workflow mais formal, dá para
-- adotar o `supabase` CLI mais tarde — ele usa `supabase_migrations.schema_migrations`,
-- mas exige Docker no fluxo local. O esquema abaixo coexiste com o CLI
-- caso a gente migre futuramente.

create table if not exists public._migrations (
  version text primary key,
  applied_at timestamptz not null default now(),
  notes text
);

-- Histórico das migrations aplicadas até o momento. `on conflict do nothing`
-- torna a inserção idempotente — rodar duas vezes não duplica nem falha.
insert into public._migrations(version, notes) values
  ('0001_init', 'schema inicial: portfolios, holdings, transactions, RLS, RPC execute_order'),
  ('0002_fx_cash_amount', 'cash_amount em transactions + execute_order com câmbio'),
  ('0003_fixed_income', 'colunas RF em holdings + RPC execute_fixed_income_buy'),
  ('0004_bond_asset_class', 'amplia asset_class_check para bond_br/bond_us'),
  ('0005_schema_migrations', 'tabela _migrations para rastrear o que está aplicado')
on conflict (version) do nothing;
