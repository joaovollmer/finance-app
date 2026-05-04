-- finance-app — suporte a renda fixa (Tesouro Direto, CDB, Treasuries…)
-- Estendemos a tabela `holdings` com campos opcionais que descrevem o título
-- e mantemos o ticker convencionalizado como `TESOURO_<INDEXADOR>_<vencimento>`
-- ou `TREASURY_<prazo>_<vencimento>` para garantir unicidade entre compras
-- diferentes. RPC dedicada (`execute_fixed_income_buy`) faz o débito de caixa
-- atomicamente e registra a transação. Resgate continua usando `execute_order`.

alter table public.holdings
  add column if not exists indexer text,
  add column if not exists index_percent numeric(8, 2),
  add column if not exists fixed_rate numeric(8, 4),
  add column if not exists purchase_date date,
  add column if not exists maturity_date date,
  add column if not exists principal numeric(18, 2);

alter table public.holdings
  drop constraint if exists holdings_indexer_check,
  add constraint holdings_indexer_check
    check (indexer is null or indexer in ('selic','cdi','ipca','prefixed','treasury'));

create or replace function public.execute_fixed_income_buy(
  p_portfolio_id uuid,
  p_ticker text,
  p_asset_class text,
  p_indexer text,
  p_index_percent numeric,
  p_fixed_rate numeric,
  p_principal numeric,
  p_cash_amount numeric,
  p_maturity_date date,
  p_name text default null
) returns public.transactions
language plpgsql
security invoker
as $$
declare
  v_user uuid;
  v_cash numeric(18,2);
  v_tx public.transactions%rowtype;
begin
  if p_principal <= 0 or p_cash_amount <= 0 then
    raise exception 'principal e cash_amount devem ser positivos';
  end if;
  if p_indexer not in ('selic','cdi','ipca','prefixed','treasury') then
    raise exception 'indexador inválido: %', p_indexer;
  end if;
  if p_asset_class not in ('bond_br','bond_us') then
    raise exception 'asset_class inválido para renda fixa: %', p_asset_class;
  end if;

  select user_id, cash_balance into v_user, v_cash
    from public.portfolios where id = p_portfolio_id for update;
  if v_user is null then raise exception 'carteira não encontrada'; end if;
  if v_user <> auth.uid() then raise exception 'acesso negado'; end if;
  if v_cash < p_cash_amount then raise exception 'saldo insuficiente'; end if;

  insert into public.holdings(
    portfolio_id, ticker, asset_class, quantity, avg_price,
    indexer, index_percent, fixed_rate, purchase_date, maturity_date, principal
  )
  values (
    p_portfolio_id, p_ticker, p_asset_class, 1, p_principal,
    p_indexer, p_index_percent, p_fixed_rate, current_date, p_maturity_date, p_principal
  );

  update public.portfolios
     set cash_balance = cash_balance - round(p_cash_amount, 2)
   where id = p_portfolio_id;

  insert into public.transactions(
    portfolio_id, ticker, asset_class, side, quantity, price, cash_amount
  ) values (
    p_portfolio_id, p_ticker, p_asset_class, 'buy', 1, p_principal,
    round(p_cash_amount, 2)
  ) returning * into v_tx;

  return v_tx;
end;
$$;
