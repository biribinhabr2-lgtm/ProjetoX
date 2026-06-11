-- ============================================================
-- FestaHub — Schema principal (Supabase / Postgres 15)
-- Execute no SQL Editor do Supabase (aba "SQL Editor" → New query)
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTENSÕES
-- ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. ORGANIZATIONS
-- ─────────────────────────────────────────────
create table if not exists public.organizations (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  name                text        not null,
  slug                text        not null unique,
  phone               text,
  city                text,
  plan                text        not null default 'trial'
                        check (plan in ('trial', 'essencial', 'profissional', 'rede')),
  trial_ends_at       timestamptz not null default (now() + interval '14 days'),
  subscription_id     text,
  subscription_status text        not null default 'trial',
  logo_url            text
);

-- ─────────────────────────────────────────────
-- 2. PROFILES  (espelha auth.users 1:1)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  full_name   text,
  phone       text
);

-- ─────────────────────────────────────────────
-- 3. MEMBERSHIPS
-- ─────────────────────────────────────────────
create table if not exists public.memberships (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  org_id      uuid        not null references public.organizations (id) on delete cascade,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  role        text        not null default 'owner'
                check (role in ('owner', 'admin', 'atendente')),
  unique (org_id, user_id)
);

-- ─────────────────────────────────────────────
-- 4. CUSTOMERS
-- ─────────────────────────────────────────────
create table if not exists public.customers (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  org_id          uuid        not null references public.organizations (id) on delete cascade,
  name            text        not null,
  phone           text,
  email           text,
  cpf             text,
  notes           text,
  child_name      text,
  child_birthdate date
);

-- ─────────────────────────────────────────────
-- 5. PACKAGES
-- ─────────────────────────────────────────────
create table if not exists public.packages (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  org_id           uuid        not null references public.organizations (id) on delete cascade,
  name             text        not null,
  description      text,
  base_price_cents integer     not null,
  max_guests       integer,
  duration_hours   numeric
);

-- ─────────────────────────────────────────────
-- 6. EVENTS (festas)
-- ─────────────────────────────────────────────
create table if not exists public.events (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  org_id          uuid        not null references public.organizations (id) on delete cascade,
  customer_id     uuid        not null references public.customers (id) on delete restrict,
  package_id      uuid        references public.packages (id) on delete set null,
  title           text,
  date            date        not null,
  start_time      time,
  end_time        time,
  guests_count    integer,
  status          text        not null default 'orcamento'
                    check (status in ('orcamento', 'confirmada', 'realizada', 'cancelada')),
  total_cents     integer     not null default 0,
  deposit_cents   integer     not null default 0,
  deposit_paid    boolean     not null default false,
  notes           text
);

-- ─────────────────────────────────────────────
-- 7. QUOTES (orçamentos)
-- ─────────────────────────────────────────────
create table if not exists public.quotes (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  org_id       uuid        not null references public.organizations (id) on delete cascade,
  customer_id  uuid        not null references public.customers (id) on delete restrict,
  event_id     uuid        references public.events (id) on delete set null,
  public_token uuid        not null unique default gen_random_uuid(),
  items        jsonb       not null default '[]',
  total_cents  integer,
  status       text        not null default 'enviado'
                 check (status in ('enviado', 'aceito', 'recusado', 'expirado')),
  valid_until  date
);

-- ─────────────────────────────────────────────
-- 8. TRANSACTIONS (financeiro)
-- ─────────────────────────────────────────────
create table if not exists public.transactions (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  org_id          uuid        not null references public.organizations (id) on delete cascade,
  event_id        uuid        references public.events (id) on delete set null,
  type            text        not null check (type in ('receita', 'despesa')),
  description     text,
  amount_cents    integer     not null,
  due_date        date,
  paid_at         date,
  category        text,
  payment_method  text
);

-- ─────────────────────────────────────────────
-- 9. AUDIT_LOG
-- ─────────────────────────────────────────────
create table if not exists public.audit_log (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  org_id      uuid        not null references public.organizations (id) on delete cascade,
  user_id     uuid        references public.profiles (id) on delete set null,
  action      text        not null,
  entity      text        not null,
  entity_id   uuid,
  payload     jsonb
);

-- ─────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────
create index if not exists idx_events_org_date       on public.events       (org_id, date);
create index if not exists idx_customers_org         on public.customers    (org_id);
create index if not exists idx_transactions_org      on public.transactions (org_id);
create index if not exists idx_quotes_org            on public.quotes       (org_id);
create index if not exists idx_quotes_public_token   on public.quotes       (public_token);
create index if not exists idx_memberships_user      on public.memberships  (user_id);

-- ─────────────────────────────────────────────
-- FUNÇÃO HELPER: orgs do usuário autenticado
-- ─────────────────────────────────────────────
create or replace function public.user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select org_id
  from   public.memberships
  where  user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────
-- TRIGGER: criar profile ao registrar usuário
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- RLS — habilitar em todas as tabelas
-- ─────────────────────────────────────────────
alter table public.organizations  enable row level security;
alter table public.profiles       enable row level security;
alter table public.memberships    enable row level security;
alter table public.customers      enable row level security;
alter table public.packages       enable row level security;
alter table public.events         enable row level security;
alter table public.quotes         enable row level security;
alter table public.transactions   enable row level security;
alter table public.audit_log      enable row level security;

-- ─────────────────────────────────────────────
-- POLÍTICAS — organizations
-- ─────────────────────────────────────────────
drop policy if exists "org_select" on public.organizations;
create policy "org_select"
  on public.organizations for select
  using (id in (select public.user_org_ids()));

drop policy if exists "org_update" on public.organizations;
create policy "org_update"
  on public.organizations for update
  using (
    id in (select public.user_org_ids())
    and exists (
      select 1 from public.memberships
      where org_id = organizations.id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ─────────────────────────────────────────────
-- POLÍTICAS — profiles
-- ─────────────────────────────────────────────
drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

-- ─────────────────────────────────────────────
-- POLÍTICAS — memberships
-- ─────────────────────────────────────────────
drop policy if exists "membership_select" on public.memberships;
create policy "membership_select"
  on public.memberships for select
  using (org_id in (select public.user_org_ids()));

drop policy if exists "membership_insert" on public.memberships;
create policy "membership_insert"
  on public.memberships for insert
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "membership_update" on public.memberships;
create policy "membership_update"
  on public.memberships for update
  using (org_id in (select public.user_org_ids()));

drop policy if exists "membership_delete" on public.memberships;
create policy "membership_delete"
  on public.memberships for delete
  using (org_id in (select public.user_org_ids()));

-- ─────────────────────────────────────────────
-- MACRO: políticas multi-tenant padrão
-- (customers, packages, events, transactions, audit_log)
-- ─────────────────────────────────────────────

-- customers
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers for select
  using (org_id in (select public.user_org_ids()));

drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers for insert
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers for update
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "customers_delete" on public.customers;
create policy "customers_delete" on public.customers for delete
  using (org_id in (select public.user_org_ids()));

-- packages
drop policy if exists "packages_select" on public.packages;
create policy "packages_select" on public.packages for select
  using (org_id in (select public.user_org_ids()));

drop policy if exists "packages_insert" on public.packages;
create policy "packages_insert" on public.packages for insert
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "packages_update" on public.packages;
create policy "packages_update" on public.packages for update
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "packages_delete" on public.packages;
create policy "packages_delete" on public.packages for delete
  using (org_id in (select public.user_org_ids()));

-- events
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select
  using (org_id in (select public.user_org_ids()));

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events for insert
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events for update
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events for delete
  using (org_id in (select public.user_org_ids()));

-- transactions
drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions for select
  using (org_id in (select public.user_org_ids()));

drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_insert" on public.transactions for insert
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "transactions_update" on public.transactions;
create policy "transactions_update" on public.transactions for update
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "transactions_delete" on public.transactions;
create policy "transactions_delete" on public.transactions for delete
  using (org_id in (select public.user_org_ids()));

-- audit_log (somente leitura/inserção; sem update/delete)
drop policy if exists "audit_select" on public.audit_log;
create policy "audit_select" on public.audit_log for select
  using (org_id in (select public.user_org_ids()));

drop policy if exists "audit_insert" on public.audit_log;
create policy "audit_insert" on public.audit_log for insert
  with check (org_id in (select public.user_org_ids()));

-- ─────────────────────────────────────────────
-- POLÍTICAS — quotes
-- (membros da org + acesso anônimo via RPC)
-- ─────────────────────────────────────────────
drop policy if exists "quotes_select" on public.quotes;
create policy "quotes_select" on public.quotes for select
  using (org_id in (select public.user_org_ids()));

drop policy if exists "quotes_insert" on public.quotes;
create policy "quotes_insert" on public.quotes for insert
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "quotes_update" on public.quotes;
create policy "quotes_update" on public.quotes for update
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "quotes_delete" on public.quotes;
create policy "quotes_delete" on public.quotes for delete
  using (org_id in (select public.user_org_ids()));

-- ─────────────────────────────────────────────
-- FUNÇÃO RPC: orçamento público (sem login)
-- Retorna o orçamento + nome da organização
-- identificado pelo token UUID público.
-- SECURITY DEFINER → ignora RLS e lê direto.
-- ─────────────────────────────────────────────
create or replace function public.get_public_quote(token uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'quote',        row_to_json(q),
    'organization', json_build_object('name', o.name, 'phone', o.phone, 'logo_url', o.logo_url),
    'customer',     json_build_object('name', c.name)
  )
  into result
  from   public.quotes       q
  join   public.organizations o on o.id = q.org_id
  join   public.customers     c on c.id = q.customer_id
  where  q.public_token = token
    and  q.status not in ('expirado');

  return result;
end;
$$;

-- Permite chamada anônima à RPC
grant execute on function public.get_public_quote(uuid) to anon;
