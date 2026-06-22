-- Adiciona coluna birthday_message_template à tabela organizations
-- para armazenar o template de mensagem de aniversário configurável por org.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS birthday_message_template text;
