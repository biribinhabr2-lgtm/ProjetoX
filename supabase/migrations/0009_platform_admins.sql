-- ============================================================
-- FestaHub 0009 — Super Admin da plataforma
-- Execute no SQL Editor do Supabase: aba "SQL Editor" → New query
-- ============================================================

-- ─── 1. Tabela platform_admins ────────────────────────────────
create table if not exists public.platform_admins (
  user_id    uuid        primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS habilitada mas sem políticas públicas → só a função SECURITY DEFINER acessa
alter table public.platform_admins enable row level security;

-- ─── 2. Função is_platform_admin() ───────────────────────────
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid()
  )
$$;

-- ─── 3. Políticas de SELECT (leitura global) para platform admin
--        Em tabelas que já têm políticas de membro, adicionamos
--        uma política extra; as políticas SELECT são OR'd pelo Postgres.

-- organizations
create policy "organizations: platform admin read all"
  on public.organizations for select
  using (public.is_platform_admin());

-- memberships
create policy "memberships: platform admin read all"
  on public.memberships for select
  using (public.is_platform_admin());

-- events
create policy "events: platform admin read all"
  on public.events for select
  using (public.is_platform_admin());

-- transactions
create policy "transactions: platform admin read all"
  on public.transactions for select
  using (public.is_platform_admin());

-- api_keys
create policy "api_keys: platform admin read all"
  on public.api_keys for select
  using (public.is_platform_admin());

-- audit_log
create policy "audit_log: platform admin read all"
  on public.audit_log for select
  using (public.is_platform_admin());

-- ─── 4. RPC admin_set_org_plan ───────────────────────────────
--    Única forma de o admin alterar plano de uma org.
--    Valida is_platform_admin() antes de qualquer escrita.
--    Registra ação no audit_log.
create or replace function public.admin_set_org_plan(
  p_org_id    uuid,
  p_plan      text,
  p_status    text,
  p_trial_end timestamptz default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Verificação de autorização — nunca confiar no contexto externo
  if not public.is_platform_admin() then
    raise exception 'Unauthorized: platform admin only';
  end if;

  -- Validar valores aceitos
  if p_plan not in ('trial', 'essencial', 'profissional', 'rede') then
    raise exception 'Invalid plan: %', p_plan;
  end if;

  if p_status not in ('active', 'inactive', 'pending', 'cancelled') then
    raise exception 'Invalid status: %', p_status;
  end if;

  -- Aplicar mudança
  update public.organizations
  set
    plan                 = p_plan,
    subscription_status  = p_status,
    trial_ends_at        = coalesce(p_trial_end, trial_ends_at)
  where id = p_org_id;

  if not found then
    raise exception 'Organization not found: %', p_org_id;
  end if;

  -- Auditoria
  insert into public.audit_log (org_id, user_id, action, entity, entity_id, payload)
  values (
    p_org_id,
    auth.uid(),
    'admin_set_org_plan',
    'organization',
    p_org_id::text,
    jsonb_build_object(
      'plan',       p_plan,
      'status',     p_status,
      'trial_end',  p_trial_end
    )
  );
end;
$$;

-- ─── 5. INSERT DO SUPER ADMIN (rodar MANUALMENTE após conferir) ──
-- Descomente, confirme o e-mail e execute separadamente:
--
-- insert into public.platform_admins (user_id)
--   select id from auth.users where email = 'biribinhabr2@gmail.com';
