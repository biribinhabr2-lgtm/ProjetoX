-- ============================================================
-- FestaHub 0007 — Escala de equipe
-- Execute no SQL Editor do Supabase: aba "SQL Editor" → New query
-- ============================================================

-- ─── 1. Funcionários ─────────────────────────────────────────
create table if not exists public.staff_members (
  id                uuid        primary key default gen_random_uuid(),
  org_id            uuid        not null references public.organizations (id) on delete cascade,
  name              text        not null,
  phone             text,
  role              text        check (role in ('recreador','monitor','cozinha','limpeza','gerente','outro')),
  hourly_rate_cents integer,
  active            boolean     not null default true,
  notes             text,
  created_at        timestamptz not null default now()
);

create index if not exists staff_members_org_idx on public.staff_members (org_id);
create index if not exists staff_members_org_active_idx on public.staff_members (org_id, active);

alter table public.staff_members enable row level security;

create policy "staff_members: membros leem"
  on public.staff_members for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));

create policy "staff_members: membros inserem"
  on public.staff_members for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid()));

create policy "staff_members: membros atualizam"
  on public.staff_members for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));

create policy "staff_members: membros deletam"
  on public.staff_members for delete
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));

-- ─── 2. Alocações (evento ↔ funcionário) ─────────────────────
create table if not exists public.event_staff (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references public.organizations (id) on delete cascade,
  event_id        uuid        not null references public.events (id) on delete cascade,
  staff_id        uuid        not null references public.staff_members (id) on delete cascade,
  start_time      time,
  end_time        time,
  role_in_event   text,
  confirmed       boolean     not null default false,
  created_at      timestamptz not null default now(),
  unique (event_id, staff_id)
);

create index if not exists event_staff_event_idx   on public.event_staff (org_id, event_id);
create index if not exists event_staff_staff_idx   on public.event_staff (org_id, staff_id);

alter table public.event_staff enable row level security;

create policy "event_staff: membros leem"
  on public.event_staff for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));

create policy "event_staff: membros inserem"
  on public.event_staff for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid()));

create policy "event_staff: membros atualizam"
  on public.event_staff for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));

create policy "event_staff: membros deletam"
  on public.event_staff for delete
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));
