-- Habilita RLS na tabela de rastreio de migrations.
-- A tabela é interna — nenhum client acessa via PostgREST.
-- Com RLS ativo e sem políticas, anon/authenticated ficam com acesso negado.
-- O service_role (cron, migrations manuais) bypassa RLS por design.

alter table public._migrations enable row level security;

insert into public._migrations(version, notes) values
  ('0006_migrations_rls', 'habilita RLS em _migrations — nega acesso anon/authenticated via PostgREST')
on conflict (version) do nothing;
