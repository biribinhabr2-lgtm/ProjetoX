-- ============================================================
-- FestaHub 0012 — Trigger de convite: auto-cria membership
-- Quando um usuário se cadastra via convite (invite-member Edge
-- Function), raw_user_meta_data contém pending_org_id e
-- pending_role. O trigger handle_new_user os lê e cria o vínculo.
-- Execute no SQL Editor do Supabase
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_role   text;
begin
  -- Cria perfil básico
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  -- Se veio via convite, cria membership automaticamente
  begin
    v_org_id := (new.raw_user_meta_data ->> 'pending_org_id')::uuid;
    v_role   := coalesce(new.raw_user_meta_data ->> 'pending_role', 'atendente');
    if v_org_id is not null then
      insert into public.memberships (org_id, user_id, role)
      values (v_org_id, new.id, v_role)
      on conflict do nothing;
    end if;
  exception when others then
    null; -- não bloqueia o cadastro se o membership falhar
  end;

  return new;
end;
$$;
