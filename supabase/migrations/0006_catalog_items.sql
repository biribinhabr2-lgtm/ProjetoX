-- ============================================================
-- FestaHub 0006 — Catálogo de produtos e serviços reutilizáveis
-- Execute no SQL Editor do Supabase: aba "SQL Editor" → New query
-- ============================================================

create table if not exists public.catalog_items (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organizations (id) on delete cascade,
  name        text        not null,
  description text,
  price_cents integer     not null default 0,
  unit        text        not null default 'un'
                check (unit in ('un', 'hora', 'pessoa', 'pacote')),
  category    text,
  active      boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- Hot path: listar itens ativos da org (usado em todo formulário de orçamento)
create index if not exists catalog_items_org_active_idx
  on public.catalog_items (org_id, active);

-- ─── RLS ─────────────────────────────────────────────────────
alter table public.catalog_items enable row level security;

create policy "catalog_items: membros leem"
  on public.catalog_items for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));

create policy "catalog_items: membros inserem"
  on public.catalog_items for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid()));

create policy "catalog_items: membros atualizam"
  on public.catalog_items for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));

create policy "catalog_items: membros deletam"
  on public.catalog_items for delete
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));
