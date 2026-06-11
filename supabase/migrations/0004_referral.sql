-- ============================================================
-- FestaHub 0004 — Sistema de indicação (referral)
-- Execute no SQL Editor do Supabase: aba "SQL Editor" → New query
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Adiciona coluna referred_by em organizations
--    Armazena o slug da org que indicou este cadastro (via ?ref=slug)
-- ─────────────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists referred_by text;

-- ─────────────────────────────────────────────────────────────
-- 2. Atualiza a RPC create_org_with_owner para aceitar o novo parâmetro
--    (substitui a versão anterior definida em 0001_schema.sql ou onde existir)
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_org_with_owner(
  p_name        text,
  p_slug        text,
  p_city        text,
  p_phone       text,
  p_referred_by text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id  uuid;
  v_user_id uuid := auth.uid();
begin
  -- Cria a organização
  insert into public.organizations (name, slug, city, phone, referred_by)
  values (p_name, p_slug, p_city, p_phone, p_referred_by)
  returning id into v_org_id;

  -- Cria o membership owner (ignora RLS — SECURITY DEFINER)
  insert into public.memberships (org_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  return json_build_object('org_id', v_org_id);
end;
$$;

-- Garante que usuários autenticados podem chamar a função
grant execute on function public.create_org_with_owner(text, text, text, text, text) to authenticated;
