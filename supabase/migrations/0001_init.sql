-- finance-app — schema inicial
-- Tabelas: portfolios, transactions, holdings, portfolio_snapshots
-- RLS: cada usuário só acessa seus próprios dados.

create extension if not exists "pgcrypto";

-- 1) Portfolios -----------------------------------------------------------

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Carteira principal',
  initial_cash numeric(18,2) not null check (initial_cash >= 0),
  cash_balance numeric(18,2) not null check (cash_balance >= 0),
  currency text not null default 'BRL',
  created_at timestamptz not null default now()
);

create index if not exists portfolios_user_id_idx on public.portfolios(user_id);

-- 2) Transactions ---------------------------------------------------------

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  ticker text not null,
  asset_class text not null check (asset_class in ('stock_br','stock_us')),
  side text not null check (side in ('buy','sell')),
  quantity numeric(18,8) not null check (quantity > 0),
  price numeric(18,4) not null check (price > 0),
  executed_at timestamptz not null default now()
);

create index if not exists transactions_portfolio_idx
  on public.transactions(portfolio_id, executed_at desc);

-- 3) Holdings (posição agregada por ativo) -------------------------------

create table if not exists public.holdings (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  ticker text not null,
  asset_class text not null check (asset_class in ('stock_br','stock_us')),
  quantity numeric(18,8) not null check (quantity >= 0),
  avg_price numeric(18,4) not null check (avg_price >= 0),
  primary key (portfolio_id, ticker)
);

-- 4) Snapshots diários do valor total da carteira ------------------------

create table if not exists public.portfolio_snapshots (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  taken_on date not null,
  total_value numeric(18,2) not null,
  primary key (portfolio_id, taken_on)
);

-- 5) RLS ------------------------------------------------------------------

alter table public.portfolios enable row level security;
alter table public.transactions enable row level security;
alter table public.holdings enable row level security;
alter table public.portfolio_snapshots enable row level security;

-- portfolios: dono direto via user_id
create policy "portfolios_select_own"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "portfolios_insert_own"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

create policy "portfolios_update_own"
  on public.portfolios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "portfolios_delete_own"
  on public.portfolios for delete
  using (auth.uid() = user_id);

-- transactions: dono via portfolio
create policy "transactions_select_own"
  on public.transactions for select
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = transactions.portfolio_id and p.user_id = auth.uid()
    )
  );

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (
    exists (
      select 1 from public.portfolios p
      where p.id = transactions.portfolio_id and p.user_id = auth.uid()
    )
  );

-- holdings: dono via portfolio
create policy "holdings_select_own"
  on public.holdings for select
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = holdings.portfolio_id and p.user_id = auth.uid()
    )
  );

create policy "holdings_modify_own"
  on public.holdings for all
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = holdings.portfolio_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portfolios p
      where p.id = holdings.portfolio_id and p.user_id = auth.uid()
    )
  );

-- snapshots: dono via portfolio
create policy "snapshots_select_own"
  on public.portfolio_snapshots for select
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_snapshots.portfolio_id and p.user_id = auth.uid()
    )
  );

create policy "snapshots_modify_own"
  on public.portfolio_snapshots for all
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_snapshots.portfolio_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_snapshots.portfolio_id and p.user_id = auth.uid()
    )
  );

-- 6) RPC: executa uma ordem (compra/venda) atomicamente ------------------
-- Garante consistência entre cash_balance, holdings e transactions.

create or replace function public.execute_order(
  p_portfolio_id uuid,
  p_ticker text,
  p_asset_class text,
  p_side text,
  p_quantity numeric,
  p_price numeric
) returns public.transactions
language plpgsql
security invoker
as $$
declare
  v_user uuid;
  v_total numeric(18,2);
  v_cash numeric(18,2);
  v_currency text;
  v_existing public.holdings%rowtype;
  v_new_qty numeric(18,8);
  v_new_avg numeric(18,4);
  v_tx public.transactions%rowtype;
begin
  if p_side not in ('buy','sell') then
    raise exception 'side inválido: %', p_side;
  end if;
  if p_quantity <= 0 or p_price <= 0 then
    raise exception 'quantidade e preço devem ser positivos';
  end if;

  select user_id, cash_balance, currency
    into v_user, v_cash, v_currency
    from public.portfolios
   where id = p_portfolio_id
   for update;

  if v_user is null then
    raise exception 'carteira não encontrada';
  end if;
  if v_user <> auth.uid() then
    raise exception 'acesso negado';
  end if;

  v_total := round(p_quantity * p_price, 2);

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

  insert into public.transactions(portfolio_id, ticker, asset_class, side, quantity, price)
  values (p_portfolio_id, p_ticker, p_asset_class, p_side, p_quantity, p_price)
  returning * into v_tx;

  return v_tx;
end;
$$;
