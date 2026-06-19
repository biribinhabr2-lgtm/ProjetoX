-- ============================================================
-- FestaHub 0014 — Melhorias no fluxo de convite
-- ============================================================

-- 1. Rastrear recusa de convite
alter table public.org_invites
  add column if not exists declined_by  uuid references auth.users(id),
  add column if not exists declined_at  timestamptz;

-- 2. Atualizar trigger para salvar phone do user_metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    phone     = coalesce(excluded.phone, profiles.phone);
  return new;
end;
$$;

-- 3. RPC: preview do convite (acessível sem autenticação para mostrar nome do buffet)
create or replace function public.get_invite_preview(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite  public.org_invites;
  v_org     public.organizations;
begin
  select * into v_invite
  from public.org_invites
  where token = p_token
    and used_at is null
    and declined_at is null
    and expires_at > now();

  if not found then
    raise exception 'Convite inválido, expirado ou já utilizado.';
  end if;

  select * into v_org from public.organizations where id = v_invite.org_id;

  return jsonb_build_object(
    'org_id',   v_invite.org_id,
    'org_name', v_org.name,
    'role',     v_invite.role
  );
end;
$$;

grant execute on function public.get_invite_preview to anon, authenticated;

-- 4. RPC: recusar convite (requer login)
create or replace function public.decline_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Faça login antes de recusar o convite.';
  end if;

  update public.org_invites
  set declined_by = v_uid, declined_at = now()
  where token = p_token
    and used_at is null
    and declined_at is null;
  -- sem erro se já recusado/expirado — idempotente
end;
$$;

grant execute on function public.decline_invite to authenticated;
