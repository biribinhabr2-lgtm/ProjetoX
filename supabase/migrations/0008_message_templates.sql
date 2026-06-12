-- ============================================================
-- FestaHub 0008 — Template de mensagem de escala + endereço
-- Execute no SQL Editor do Supabase: aba "SQL Editor" → New query
-- ============================================================

alter table public.organizations
  add column if not exists address text,
  add column if not exists staff_message_template text
    default 'Olá {nome}! Segue sua escala no {buffet}:
📍 Local: {local}
📅 Data: {data}
⏰ Horário: {horario_inicio} às {horario_fim}
⏱️ Duração: {duracao}
🎉 Festa: {festa}
Qualquer dúvida, fale com a gente. Até lá!';
