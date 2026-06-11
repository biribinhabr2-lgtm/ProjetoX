-- ============================================================
-- FestaHub 0003 — Ações públicas de orçamento
-- Execute no SQL Editor do Supabase: aba "SQL Editor" → New query
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Adiciona coluna notes à tabela quotes (se não existir)
-- ─────────────────────────────────────────────────────────────
alter table public.quotes
  add column if not exists notes text;

-- ─────────────────────────────────────────────────────────────
-- 2. RPC pública: update_public_quote_status
--
-- Permite que o cliente (sem autenticação) aceite ou recuse
-- um orçamento usando apenas o token UUID público.
--
-- Regras:
--   • Só aceita p_status = 'aceito' | 'recusado'
--   • Só atualiza se o status atual for 'enviado'
--   • SECURITY DEFINER → ignora RLS (acesso via token)
-- ─────────────────────────────────────────────────────────────
create or replace function public.update_public_quote_status(
  p_token  uuid,
  p_status text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_current  text;
begin
  -- Validar status permitido
  if p_status not in ('aceito', 'recusado') then
    return json_build_object(
      'ok',    false,
      'error', 'Status inválido. Use ''aceito'' ou ''recusado''.'
    );
  end if;

  -- Buscar orçamento pelo token
  select id, status
  into   v_quote_id, v_current
  from   public.quotes
  where  public_token = p_token;

  if v_quote_id is null then
    return json_build_object(
      'ok',    false,
      'error', 'Orçamento não encontrado.'
    );
  end if;

  -- Só pode responder se ainda estiver 'enviado'
  if v_current <> 'enviado' then
    return json_build_object(
      'ok',      false,
      'error',   'Este orçamento já foi respondido.',
      'status',  v_current
    );
  end if;

  -- Atualizar
  update public.quotes
  set    status = p_status
  where  id     = v_quote_id;

  return json_build_object(
    'ok',       true,
    'quote_id', v_quote_id,
    'status',   p_status
  );
end;
$$;

-- Permite chamada anônima (cliente sem login)
grant execute on function public.update_public_quote_status(uuid, text) to anon;

-- ─────────────────────────────────────────────────────────────
-- Observação: a função get_public_quote(token uuid) já existe
-- em 0001_schema.sql e não precisa de alteração.
-- ─────────────────────────────────────────────────────────────
