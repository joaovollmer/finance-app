-- Hotfix v1.1 — a migration 0003 introduziu execute_fixed_income_buy aceitando
-- asset_class in ('bond_br','bond_us'), mas a constraint original criada em
-- 0001_init.sql só permitia ('stock_br','stock_us'). Resultado: a RPC erra
-- com `holdings_asset_class_check` ao inserir um título de RF.
-- Aqui ampliamos o check em holdings e transactions para o universo atual
-- (ações + renda fixa). Idempotente: drop if exists + add.

alter table public.holdings
  drop constraint if exists holdings_asset_class_check;

alter table public.holdings
  add constraint holdings_asset_class_check
  check (asset_class in ('stock_br','stock_us','bond_br','bond_us'));

alter table public.transactions
  drop constraint if exists transactions_asset_class_check;

alter table public.transactions
  add constraint transactions_asset_class_check
  check (asset_class in ('stock_br','stock_us','bond_br','bond_us'));
