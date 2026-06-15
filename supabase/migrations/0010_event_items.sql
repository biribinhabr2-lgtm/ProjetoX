-- ─── Itens de evento ─────────────────────────────────────────
-- Permite associar múltiplos itens (do catálogo ou manuais) a um evento.
-- org_id obrigatório para RLS multi-tenant.

create table public.event_items (
  id               uuid        default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  org_id           uuid        not null references public.organizations(id) on delete cascade,
  event_id         uuid        not null references public.events(id) on delete cascade,
  catalog_item_id  uuid        references public.catalog_items(id) on delete set null,
  description      text        not null,
  qty              int         not null default 1 check (qty > 0),
  unit_price_cents int         not null default 0 check (unit_price_cents >= 0)
);

alter table public.event_items enable row level security;

-- Usa EXISTS em vez de = ANY(srf()) — set-returning functions não são permitidas
-- diretamente em expressões de policy no PostgreSQL moderno.
create policy "event_items: select"
  on public.event_items for select
  using (exists (
    select 1 from public.memberships
    where memberships.org_id = event_items.org_id
      and memberships.user_id = auth.uid()
  ));

create policy "event_items: insert"
  on public.event_items for insert
  with check (exists (
    select 1 from public.memberships
    where memberships.org_id = event_items.org_id
      and memberships.user_id = auth.uid()
  ));

create policy "event_items: update"
  on public.event_items for update
  using (exists (
    select 1 from public.memberships
    where memberships.org_id = event_items.org_id
      and memberships.user_id = auth.uid()
  ));

create policy "event_items: delete"
  on public.event_items for delete
  using (exists (
    select 1 from public.memberships
    where memberships.org_id = event_items.org_id
      and memberships.user_id = auth.uid()
  ));

create index on public.event_items (org_id);
create index on public.event_items (event_id);
