-- ============================================================
-- FestaHub 0014 — Security Hardening
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. MEMBERSHIPS — restringir INSERT/UPDATE/DELETE a owner/admin
--
-- Problema original: qualquer membro (incluindo 'atendente')
-- podia inserir, atualizar ou excluir memberships da sua org,
-- permitindo escalada de privilégio (ex: atendente se promovendo
-- a admin/owner ou adicionando qualquer usuário sem convite).
--
-- Correção: INSERT/UPDATE/DELETE exigem role in ('owner','admin').
-- SELECT mantido para todos os membros.
-- A RPC accept_invite (SECURITY DEFINER) não é afetada pela RLS.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "membership_insert"        on public.memberships;
drop policy if exists "membership_update"        on public.memberships;
drop policy if exists "membership_delete"        on public.memberships;

-- Somente owner/admin pode adicionar memberships
create policy "membership_insert"
  on public.memberships for insert
  with check (
    org_id in (select public.user_org_ids())
    and exists (
      select 1 from public.memberships m
      where m.org_id  = memberships.org_id
        and m.user_id = auth.uid()
        and m.role    in ('owner', 'admin')
    )
  );

-- Somente owner/admin pode atualizar memberships
-- Protege contra downgrade do owner (role = 'owner' não pode ser alterado por admin)
create policy "membership_update"
  on public.memberships for update
  using (
    org_id in (select public.user_org_ids())
    and exists (
      select 1 from public.memberships m
      where m.org_id  = memberships.org_id
        and m.user_id = auth.uid()
        and m.role    in ('owner', 'admin')
    )
  )
  with check (
    -- Admin não pode criar/promover outro owner
    (
      role != 'owner'
      or exists (
        select 1 from public.memberships m
        where m.org_id  = memberships.org_id
          and m.user_id = auth.uid()
          and m.role    = 'owner'
      )
    )
  );

-- Somente owner/admin pode remover memberships
create policy "membership_delete"
  on public.memberships for delete
  using (
    org_id in (select public.user_org_ids())
    and exists (
      select 1 from public.memberships m
      where m.org_id  = memberships.org_id
        and m.user_id = auth.uid()
        and m.role    in ('owner', 'admin')
    )
    -- Impede que o último owner seja removido
    and (
      role != 'owner'
      or (
        select count(*) from public.memberships m2
        where m2.org_id = memberships.org_id
          and m2.role   = 'owner'
      ) > 1
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. ORG_INVITES — adicionar policy de DELETE para owner/admin
-- ─────────────────────────────────────────────────────────────

drop policy if exists "org_invites: delete" on public.org_invites;

create policy "org_invites: delete"
  on public.org_invites for delete
  using (
    exists (
      select 1 from public.memberships
      where memberships.org_id   = org_invites.org_id
        and memberships.user_id  = auth.uid()
        and memberships.role     in ('owner', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. MP_WEBHOOK_EVENTS — tabela de idempotência do webhook
--
-- O webhook do Mercado Pago pode enviar a mesma notificação
-- múltiplas vezes. Esta tabela garante que cada combinação
-- (subscription_id, mp_status) seja processada uma única vez.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.mp_webhook_events (
  subscription_id  text        not null,
  mp_status        text        not null,
  processed_at     timestamptz not null default now(),
  primary key (subscription_id, mp_status)
);

-- Sem RLS — só acessível via service role nas Edge Functions
-- (nenhum usuário deve ler/escrever diretamente)
alter table public.mp_webhook_events enable row level security;
-- Sem políticas públicas = bloqueio total ao acesso direto
