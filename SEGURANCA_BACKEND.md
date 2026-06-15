# Relatório de Auditoria de Segurança — FestaHub Backend

**Data:** 2026-06-15  
**Escopo:** Isolamento multi-tenant, segredos, webhook MP, API v1, Edge Functions, autenticação.

---

## ⚠️ AÇÕES MANUAIS NECESSÁRIAS (execute no Supabase SQL Editor)

### 1. Migration 0014 — Segurança (OBRIGATÓRIO)
Execute o conteúdo de `supabase/migrations/0014_security_hardening.sql`:
- Corrige escalada de privilégio em `memberships`
- Adiciona policy DELETE em `org_invites`
- Cria tabela `mp_webhook_events` para idempotência do webhook

### 2. Configurar segredo do webhook MP (RECOMENDADO)
No painel do Mercado Pago:
1. Acesse **Suas integrações → Webhooks**
2. Anote o **Secret** gerado pelo MP para validação de assinatura
3. Configure no Supabase:
```bash
supabase secrets set MP_WEBHOOK_SECRET="<secret_do_painel_mp>" --project-ref mjnjxhtkfmwhzatgpbox
```

### 3. Redesployar as Edge Functions modificadas
```bash
supabase functions deploy mp-webhook --project-ref mjnjxhtkfmwhzatgpbox
supabase functions deploy create-subscription --project-ref mjnjxhtkfmwhzatgpbox
supabase functions deploy create-api-key --project-ref mjnjxhtkfmwhzatgpbox
```

---

## 1. Isolamento Multi-Tenant (RLS)

### Tabelas auditadas

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE | Status |
|---|---|---|---|---|---|---|
| organizations | ✓ | ✓ org | via RPC | ✓ owner/admin | — | OK |
| profiles | ✓ | ✓ próprio | ✓ próprio | ✓ próprio | — | OK |
| memberships | ✓ | ✓ | ✓ | ✓ | ✓ | CORRIGIDO |
| customers | ✓ | ✓ org | ✓ org | ✓ org | ✓ org | OK |
| packages | ✓ | ✓ org | ✓ org | ✓ org | ✓ org | OK |
| events | ✓ | ✓ org | ✓ org | ✓ org | ✓ org | OK |
| quotes | ✓ | ✓ org | ✓ org | ✓ org | ✓ org | OK |
| transactions | ✓ | ✓ org | ✓ org | ✓ org | ✓ org | OK |
| audit_log | ✓ | ✓ org | ✓ org | — | — | OK |
| api_keys | ✓ | ✓ owner/admin | ✓ owner/admin | ✓ owner/admin | ✓ owner | OK |
| catalog_items | ✓ | ✓ org | ✓ org | ✓ org | ✓ org | OK |
| staff_members | ✓ | ✓ org | ✓ org | ✓ org | ✓ org | OK |
| event_staff | ✓ | ✓ org | ✓ org | ✓ org | ✓ org | OK |
| platform_admins | ✓ | sem policy pública | — | — | — | OK |
| event_items | ✓ | ✓ org | ✓ org | ✓ org | ✓ org | OK |
| org_invites | ✓ | ✓ org | ✓ owner/admin | via RPC | ✓ owner/admin | CORRIGIDO |
| mp_webhook_events | ✓ | sem policy pública | — | — | — | NOVO (0014) |

### [CORRIGIDO] Escalada de privilégio em `memberships`

**Problema:** As policies de `INSERT`, `UPDATE` e `DELETE` em `memberships` verificavam apenas `org_id in user_org_ids()`, permitindo que qualquer membro (inclusive `atendente`) inserisse novos memberships, atualizasse roles (inclusive para `owner`) ou removesse memberships da organização, sem precisar ter role `owner` ou `admin`.

**Risco:** Um `atendente` malicioso podia:
- Promover a si mesmo para `admin` ou `owner`
- Adicionar qualquer usuário da plataforma à organização sem convite
- Remover o owner da organização

**Correção (migration 0014):**
- `membership_insert`: exige que o usuário logado seja `owner` ou `admin` da org
- `membership_update`: exige `owner`/`admin`; impede `admin` de criar/promover outro `owner`
- `membership_delete`: exige `owner`/`admin`; impede remoção do último `owner`

Nenhum `USING (true)` ou policy excessivamente permissiva encontrada nas demais tabelas.

---

## 2. Segredos

### [OK] Nenhum segredo no bundle do frontend

Varredura em `src/` não encontrou:
- `service_role` / `SUPABASE_SERVICE` → não presente
- `MP_ACCESS_TOKEN` / `ACCESS_TOKEN` → não presente
- `RESEND_API_KEY` / `re_live_` → não presente
- Chaves hardcoded em texto puro → não presente

As ocorrências de `fh_live_` em `src/` são apenas strings de documentação mascaradas (`fh_live_<sua_chave>`) e texto de exemplo de curl, nunca chaves reais.

### [OK] `.gitignore` cobre variáveis de ambiente

`.gitignore` contém: `.env`, `.env.local`, `.env.*.local` — todos os formatos padrão estão cobertos.

### [OK] Variáveis VITE_ são apenas as anon keys públicas

Somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são prefixadas com `VITE_` (expostas no bundle). Essas são credenciais públicas por design do Supabase. Nenhum segredo real usa o prefixo `VITE_`.

### [OK] Segredos em Edge Functions lidos via `Deno.env.get`

`MP_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `APP_URL` — todos lidos exclusivamente via variável de ambiente no servidor, nunca expostos ao cliente.

---

## 3. Webhook do Mercado Pago

### [CORRIGIDO] Validação HMAC-SHA256

**Problema:** O webhook não validava o header `x-signature` enviado pelo MP.

**Correção:** Implementada validação HMAC-SHA256 em `mp-webhook/index.ts`:
- Lê `MP_WEBHOOK_SECRET` do ambiente
- Reconstrói a mensagem: `id:{data.id};request-id:{x-request-id};ts:{ts};`
- Compara HMAC usando comparação em tempo constante (evita timing attack)
- Se `MP_WEBHOOK_SECRET` não estiver configurado, loga aviso mas não bloqueia (deploy gradual)
- **AÇÃO MANUAL:** configurar `MP_WEBHOOK_SECRET` no Supabase + painel MP (ver seção acima)

### [CORRIGIDO] Idempotência

**Problema:** O mesmo evento MP poderia ser processado múltiplas vezes (MP garante "at least once delivery").

**Correção:** Tabela `mp_webhook_events` criada na migration 0014:
- Primary key composta: `(subscription_id, mp_status)`
- Antes de processar, tenta inserir; se `ON CONFLICT (23505)` → já processado → ignora
- Se erro inesperado na inserção → continua (melhor duplicado do que perder evento)

### [OK] Verificação via API do MP (fonte de verdade)

O webhook SEMPRE faz `GET /preapproval/{id}` na API do MP antes de atualizar o banco. O body da notificação é usado apenas para extrair o `subscription_id` — nunca para tomar decisões de negócio.

---

## 4. API Pública v1

### [OK] Autenticação por hash SHA-256

A chave recebida é hasheada com `crypto.subtle.digest('SHA-256', ...)` (Web Crypto) e comparada contra `key_hash` no banco. A chave original nunca é armazenada.

### [OK] Isolamento por `org_id`

Toda query da API v1 inclui `.eq('org_id', orgId)` onde `orgId` é derivado exclusivamente da API key no banco (nunca do payload externo). O código contém comentários explícitos marcando cada filtro obrigatório.

### [OK] Rate limiting

Rate limiter em memória implementado: 60 req/min por `key_hash`, com janela deslizante de 60 segundos. Limitação: em memória → resetado a cada cold start da Edge Function. Aceitável para o volume atual.

### [OK] Validação de entrada

`validateEventCreate` e `pickPatchableFields` validam todos os campos recebidos. Body JSON inválido → 400. Campo inválido → 422.

---

## 5. Edge Functions — Geral

### [CORRIGIDO] CORS restrito por origem

**Problema:** `_shared/cors.ts` usava `'Access-Control-Allow-Origin': '*'` em funções chamadas pelo browser com JWT (`create-subscription`, `create-api-key`).

**Correção:** `cors.ts` atualizado com `resolveOrigin()`:
- Lista explícita de origens permitidas: produção (`APP_URL`), Vercel previews (`.vercel.app`), localhost de dev
- Header `Vary: Origin` adicionado para cache correto
- Mantida compatibilidade retroativa via export `corsHeaders` (usado na api-v1 e send-email que são server-to-server)

**Nota:** Para `mp-webhook` e `api-v1` (server-to-server), CORS com `*` é tecnicamente aceitável pois a autenticação não depende de cookies. Mantido `*` nesses casos por design.

### [OK] Sem concatenação de string em SQL

Todas as queries usam o client do Supabase (parameterized internamente). Nenhuma raw SQL com concatenação encontrada nas Edge Functions.

### [OK] Validação de entrada em todas as funções

- `create-subscription`: valida JWT, verifica `plan` contra lista permitida, verifica role `owner`
- `create-api-key`: valida JWT, comprimento do nome (2–80 chars), role `owner`/`admin`, plano
- `mp-webhook`: type guards para ambos os formatos de notificação
- `send-email`: valida template e dados antes de chamar Resend

---

## 6. Autenticação e Autorização

### [OK] Status de admin verificado no banco

`is_platform_admin()` é uma função SECURITY DEFINER que acessa `platform_admins` sem RLS. A tabela `platform_admins` tem RLS ativo mas sem políticas públicas — inacessível diretamente. O frontend nunca compara e-mail para verificar admin status.

### [OK] `admin_set_org_plan` valida `is_platform_admin()` no banco

A RPC verifica autorização antes de qualquer escrita. Mesmo que o frontend seja comprometido, a RPC bloqueia no banco.

### [AÇÃO MANUAL NECESSÁRIA] Brute force / rate limiting no login

O rate limiting de autenticação é gerenciado pelo Supabase Auth internamente (não configurável no tier gratuito/pro). Para o link público de orçamento (`/orcamento/:token`), o token é um UUID v4 (122 bits de entropia) — força bruta é computacionalmente inviável.

---

## Resumo Executivo

| Categoria | Findings | Corrigidos | Ação Manual |
|---|---|---|---|
| RLS multi-tenant | 2 (memberships, org_invites) | 2 | Rodar migration 0014 |
| Segredos | 0 | — | — |
| Webhook MP | 2 (HMAC, idempotência) | 2 | Configurar MP_WEBHOOK_SECRET |
| API v1 | 0 | — | — |
| CORS | 1 (create-subscription, create-api-key) | 1 | Redesployar EFs |
| Autenticação | 0 | — | — |

**Nível de risco residual após correções:** Baixo. O único item de alto impacto pendente é configurar `MP_WEBHOOK_SECRET` (sem ele, o webhook ainda funciona mas não valida assinatura do MP).
