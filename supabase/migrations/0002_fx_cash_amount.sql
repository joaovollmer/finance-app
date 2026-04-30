-- finance-app — suporte a câmbio em ordens
-- Antes: execute_order debitava do caixa BRL `quantity * price` mesmo para ativos
-- em USD, gerando inconsistência. Agora a aplicação calcula o valor convertido
-- (cash_amount em BRL) e a RPC apenas aplica essa quantia ao cash_balance.

alter table public.transactions
  add column if not exists cash_amount numeric(18,2);

update public.transactions
  set cash_amount = round(quantity * price, 2)
  where cash_amount is null;

alter table public.transactions
  alter column cash_amount set not null,
  add constraint transactions_cash_amount_positive check (cash_amount > 0);

-- Substitui a RPC para incluir o novo parâmetro.
drop function if exists public.execute_order(uuid, text, text, text, numeric, numeric);

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
  v_existing public.holdings%rowtype;
  v_new_qty numeric(18,8);
  v_new_avg numeric(18,4);
  v_total numeric(18,2);
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

  select user_id, cash_balance
    into v_user, v_cash
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
    if v_cash < v_total then
      raise exception 'saldo insuficiente';
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

    update public.portfolios
       set cash_balance = cash_balance - v_total
     where id = p_portfolio_id;

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
