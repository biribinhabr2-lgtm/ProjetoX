-- ============================================================
-- FestaHub 0011 — Avatar de perfil do usuário
-- Execute no SQL Editor do Supabase
-- ============================================================

alter table public.profiles
  add column if not exists avatar_url text;
