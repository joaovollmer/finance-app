-- finance-app — Onboarding flexível (deposit-on-buy)
-- Permite carteiras sem saldo inicial obrigatório. Quando deposit_mode=true,
-- cada compra incrementa total_deposited (ao invés de debitar cash_balance),
-- modelando um aporte sob demanda. Vendas sempre creditam cash_balance —
-- vira reserva disponível para próximas compras antes de exigir novo aporte.
--
-- Compatibilidade: portfolios existentes ficam com deposit_mode=false e
-- total_deposited = initial_cash (backfill abaixo). Comportamento atual
-- preservado integralmente para esses portfolios.

alter table public.portfolios
  add column if not exists deposit_mode boolean not null default false,
  add column if not exists total_deposited numeric(18,2) not null default 0;

-- Backfill: para portfolios pré-existentes, total_deposited = initial_cash
-- (eles já têm cash_balance = initial_cash no início). Idempotente: só
-- atualiza onde total_deposited está zerado e initial_cash > 0.
update public.portfolios
   set total_deposited = initial_cash
 where total_deposited = 0
   and initial_cash > 0
   and deposit_mode = false;

-- Atualiza execute_order para suportar deposit_mode.
-- Em deposit_mode=true:
--   - buy: usa cash_balance disponível primeiro (vendas anteriores), e o
--     que faltar entra como aporte novo (total_deposited += diferença).
--     cash_balance vai a zero quando precisa de aporte. Nunca falha por
--     saldo insuficiente.
--   - sell: credita cash_balance normalmente (idêntico ao modo padrão).
-- Em deposit_mode=false: comportamento idêntico ao anterior.

drop function if exists public.execute_order(uuid, text, text, text, numeric, numeric, numeric);

create or replace function public.execute_order(
  p_portfolio_id uuid,
  p_ticker text,
  p_asset_class text,
  p_side text,
  p_quantity numeric,
  p_price numeric,
  p_cash_amount numeric
) returns public.transactions
language plpgsql
security invoker
as $$
declare
  v_user uuid;
  v_cash numeric(18,2);
  v_deposit_mode boolean;
  v_existing public.holdings%rowtype;
  v_new_qty numeric(18,8);
  v_new_avg numeric(18,4);
  v_total numeric(18,2);
  v_use_cash numeric(18,2);
  v_top_up numeric(18,2);
  v_tx public.transactions%rowtype;
begin
  if p_side not in ('buy','sell') then
    raise exception 'side inválido: %', p_side;
  end if;
  if p_quantity <= 0 or p_price <= 0 then
    raise exception 'quantidade e preço devem ser positivos';
  end if;
  if p_cash_amount <= 0 then
    raise exception 'cash_amount deve ser positivo';
  end if;

  v_total := round(p_cash_amount, 2);

  select user_id, cash_balance, deposit_mode
    into v_user, v_cash, v_deposit_mode
    from public.portfolios
   where id = p_portfolio_id
   for update;

  if v_user is null then
    raise exception 'carteira não encontrada';
  end if;
  if v_user <> auth.uid() then
    raise exception 'acesso negado';
  end if;

  select * into v_existing
    from public.holdings
   where portfolio_id = p_portfolio_id and ticker = p_ticker
   for update;

  if p_side = 'buy' then
    if v_deposit_mode then
      -- Consome saldo disponível primeiro; o restante vira aporte novo.
      v_use_cash := least(v_cash, v_total);
      v_top_up := v_total - v_use_cash;
      update public.portfolios
         set cash_balance = cash_balance - v_use_cash,
             total_deposited = total_deposited + v_top_up
       where id = p_portfolio_id;
    else
      if v_cash < v_total then
        raise exception 'saldo insuficiente';
      end if;
      update public.portfolios
         set cash_balance = cash_balance - v_total
       where id = p_portfolio_id;
    end if;

    if v_existing.ticker is null then
      insert into public.holdings(portfolio_id, ticker, asset_class, quantity, avg_price)
      values (p_portfolio_id, p_ticker, p_asset_class, p_quantity, p_price);
    else
      v_new_qty := v_existing.quantity + p_quantity;
      v_new_avg := round(
        ((v_existing.quantity * v_existing.avg_price) + (p_quantity * p_price)) / v_new_qty,
        4
      );
      update public.holdings
         set quantity = v_new_qty,
             avg_price = v_new_avg
       where portfolio_id = p_portfolio_id and ticker = p_ticker;
    end if;

  else -- sell
    if v_existing.ticker is null or v_existing.quantity < p_quantity then
      raise exception 'posição insuficiente para venda';
    end if;

    v_new_qty := v_existing.quantity - p_quantity;
    if v_new_qty = 0 then
      delete from public.holdings
       where portfolio_id = p_portfolio_id and ticker = p_ticker;
    else
      update public.holdings
         set quantity = v_new_qty
       where portfolio_id = p_portfolio_id and ticker = p_ticker;
    end if;

    update public.portfolios
       set cash_balance = cash_balance + v_total
     where id = p_portfolio_id;
  end if;

  insert into public.transactions(
    portfolio_id, ticker, asset_class, side, quantity, price, cash_amount
  )
  values (
    p_portfolio_id, p_ticker, p_asset_class, p_side, p_quantity, p_price, v_total
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

-- Mesma lógica para a RPC de renda fixa.
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
  v_deposit_mode boolean;
  v_total numeric(18,2);
  v_use_cash numeric(18,2);
  v_top_up numeric(18,2);
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

  v_total := round(p_cash_amount, 2);

  select user_id, cash_balance, deposit_mode
    into v_user, v_cash, v_deposit_mode
    from public.portfolios where id = p_portfolio_id for update;
  if v_user is null then raise exception 'carteira não encontrada'; end if;
  if v_user <> auth.uid() then raise exception 'acesso negado'; end if;

  if v_deposit_mode then
    v_use_cash := least(v_cash, v_total);
    v_top_up := v_total - v_use_cash;
    update public.portfolios
       set cash_balance = cash_balance - v_use_cash,
           total_deposited = total_deposited + v_top_up
     where id = p_portfolio_id;
  else
    if v_cash < v_total then raise exception 'saldo insuficiente'; end if;
    update public.portfolios
       set cash_balance = cash_balance - v_total
     where id = p_portfolio_id;
  end if;

  insert into public.holdings(
    portfolio_id, ticker, asset_class, quantity, avg_price,
    indexer, index_percent, fixed_rate, purchase_date, maturity_date, principal
  )
  values (
    p_portfolio_id, p_ticker, p_asset_class, 1, p_principal,
    p_indexer, p_index_percent, p_fixed_rate, current_date, p_maturity_date, p_principal
  );

  insert into public.transactions(
    portfolio_id, ticker, asset_class, side, quantity, price, cash_amount
  ) values (
    p_portfolio_id, p_ticker, p_asset_class, 'buy', 1, p_principal,
    v_total
  ) returning * into v_tx;

  return v_tx;
end;
$$;

insert into public._migrations(version, notes) values
  ('0007_deposit_on_buy', 'Onboarding flexível: portfolios.deposit_mode + total_deposited + RPCs adaptadas')
on conflict (version) do nothing;
