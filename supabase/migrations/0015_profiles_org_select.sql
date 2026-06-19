-- ============================================================
-- FestaHub 0015 — Permite membros da org lerem perfis uns dos outros
-- Sem isso, o join memberships→profiles retorna null pelo RLS
-- ============================================================

drop policy if exists "profile_select_org_member" on public.profiles;

create policy "profile_select_org_member"
  on public.profiles for select
  using (
    -- próprio perfil (já existia)
    auth.uid() = id
    -- ou membro da mesma organização
    or exists (
      select 1
      from public.memberships m1
      join public.memberships m2 on m1.org_id = m2.org_id
      where m1.user_id = auth.uid()
        and m2.user_id = profiles.id
    )
  );
