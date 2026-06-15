-- ============================================================
-- FestaHub 0013 — Convites de membros via link compartilhável
-- Idempotente: pode ser executado múltiplas vezes sem erro
-- ============================================================

create table if not exists public.org_invites (
  id          uuid        default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  org_id      uuid        not null references public.organizations(id) on delete cascade,
  created_by  uuid        not null references auth.users(id),
  role        text        not null default 'atendente' check (role in ('admin', 'atendente')),
  token       text        not null unique default encode(gen_random_bytes(16), 'hex'),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  used_by     uuid        references auth.users(id),
  used_at     timestamptz
);

alter table public.org_invites enable row level security;

drop policy if exists "org_invites: select" on public.org_invites;
drop policy if exists "org_invites: insert" on public.org_invites;

create policy "org_invites: select"
  on public.org_invites for select
  using (exists (
    select 1 from public.memberships
    where memberships.org_id = org_invites.org_id
      and memberships.user_id = auth.uid()
  ));

create policy "org_invites: insert"
  on public.org_invites for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.memberships
      where memberships.org_id = org_invites.org_id
        and memberships.user_id = auth.uid()
        and memberships.role in ('owner', 'admin')
    )
  );

create index if not exists org_invites_token_idx on public.org_invites (token);
create index if not exists org_invites_org_id_idx on public.org_invites (org_id);

-- ─── RPC: aceitar convite ─────────────────────────────────────
create or replace function public.accept_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite  public.org_invites;
  v_uid     uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Faça login antes de aceitar o convite.';
  end if;

  select * into v_invite
  from public.org_invites
  where token = p_token
    and used_at is null
    and expires_at > now();

  if not found then
    raise exception 'Convite inválido ou expirado.';
  end if;

  if exists (
    select 1 from public.memberships
    where org_id = v_invite.org_id and user_id = v_uid
  ) then
    return jsonb_build_object('org_id', v_invite.org_id, 'already_member', true);
  end if;

  insert into public.memberships (org_id, user_id, role)
  values (v_invite.org_id, v_uid, v_invite.role);

  update public.org_invites
  set used_by = v_uid, used_at = now()
  where id = v_invite.id;

  return jsonb_build_object('org_id', v_invite.org_id, 'already_member', false);
end;
$$;

grant execute on function public.accept_invite to authenticated;
