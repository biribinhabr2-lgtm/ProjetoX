-- ============================================================
-- FestaHub 0005 — API Keys para integração externa
-- Execute no SQL Editor do Supabase: aba "SQL Editor" → New query
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Tabela api_keys
--    - key_hash : SHA-256 da chave completa (nunca texto puro)
--    - key_prefix: primeiros 8 chars após 'fh_live_' para exibição
--    - revoked_at : null = ativa, timestamp = revogada
-- ─────────────────────────────────────────────────────────────
create table if not exists public.api_keys (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid        not null references public.organizations (id) on delete cascade,
  name         text        not null,
  key_prefix   text        not null,
  key_hash     text        not null,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- Índice para autenticação rápida por hash (hot path de toda request da API)
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash)
  where revoked_at is null;

-- ─────────────────────────────────────────────────────────────
-- 2. RLS — apenas owner/admin da própria org pode operar
-- ─────────────────────────────────────────────────────────────
alter table public.api_keys enable row level security;

-- Listar chaves da org
create policy "api_keys: owner/admin lista"
  on public.api_keys for select
  using (
    org_id in (
      select org_id from public.memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Criar chave (via Edge Function create-api-key com service role — RLS não bloqueia service role)
-- Esta política cobre chamadas diretas (ex.: REST) caso existam no futuro
create policy "api_keys: owner/admin insere"
  on public.api_keys for insert
  with check (
    org_id in (
      select org_id from public.memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Revogar (update de revoked_at)
create policy "api_keys: owner/admin revoga"
  on public.api_keys for update
  using (
    org_id in (
      select org_id from public.memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Deleção não exposta na UI; mantida apenas para cascata de org
create policy "api_keys: owner deleta"
  on public.api_keys for delete
  using (
    org_id in (
      select org_id from public.memberships
      where user_id = auth.uid()
        and role = 'owner'
    )
  );
