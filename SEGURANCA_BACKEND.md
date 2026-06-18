# Relatório de Segurança — FestaHub Backend

**Data:** 2026-06-18  
**Escopo:** Migrations SQL (RLS), Edge Functions, frontend (vazamento de segredos)

---

## Comandos SQL para rodar no Supabase (em ordem)

Todas as migrations anteriores (0001–0014) já cobrem os controles necessários. **Nenhum SQL adicional é necessário** — as correções desta auditoria são exclusivamente em código TypeScript das Edge Functions e do frontend.

> Se as migrations 0013 e 0014 ainda não foram executadas no banco, execute-as antes de usar as funcionalidades de convite e webhook de pagamento.

---

## 1. ISOLAMENTO MULTI-TENANT (RLS)

| Tabela | RLS ativo | SELECT | INSERT | UPDATE | DELETE | Resultado |
|---|---|---|---|---|---|---|
| organizations | OK | OK | — | OK (owner/admin) | — | **[OK]** |
| profiles | OK | OK (uid=self) | OK | OK | — | **[OK]** |
| memberships | OK | OK | OK (owner/admin, 0014) | OK (owner/admin, 0014) | OK (owner/admin, 0014) | **[OK]** |
| customers | OK | OK | OK | OK | OK | **[OK]** |
| packages | OK | OK | OK | OK | OK | **[OK]** |
| events | OK | OK | OK | OK | OK | **[OK]** |
| quotes | OK | OK | OK | OK | OK | **[OK]** |
| transactions | OK | OK | OK | OK | OK | **[OK]** |
| audit_log | OK | OK | OK | — | — | **[OK]** |
| api_keys | OK | OK (owner/admin) | OK | OK | OK (owner) | **[OK]** |
| catalog_items | OK | OK | OK | OK | OK | **[OK]** |
| staff_members | OK | OK | OK | OK | OK | **[OK]** |
| event_staff | OK | OK | OK | OK | OK | **[OK]** |
| event_items | OK | OK | OK | OK | OK | **[OK]** |
| org_invites | OK | OK (membros) | OK (owner/admin) | — | OK (owner/admin, 0014) | **[OK]** |
| mp_webhook_events | OK | sem policies (bloqueio total) | — | — | — | **[OK]** |
| platform_admins | OK | sem policies (bloqueio total) | — | — | — | **[OK]** |

Nenhuma policy `USING (true)` encontrada. Todas as policies filtram por `org_id` via `user_org_ids()` (SECURITY DEFINER) ou `auth.uid()`.

A migration 0014 já corrigiu a escalada de privilégio em memberships (atendente não pode se promover a admin/owner).

---

## 2. SEGREDOS

**[OK]** Nenhum segredo hardcoded encontrado em `src/`.

**[OK]** `.env`, `.env.local`, `.env.*.local` listados no `.gitignore`.

**[OK]** Únicas variáveis `VITE_` no frontend são `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` — ambas são públicas por design do Supabase (a anon key só dá acesso ao que RLS permite).

**[OK]** `MP_ACCESS_TOKEN`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MP_WEBHOOK_SECRET` lidos exclusivamente via `Deno.env.get()` dentro de Edge Functions.

---

## 3. WEBHOOK DO MERCADO PAGO

**[OK]** Validação HMAC-SHA256 implementada (`validateMpSignature`) usando `MP_WEBHOOK_SECRET`. Comparação em tempo constante (`timingSafeEqual`) para evitar timing attacks.

**[OK]** Idempotência garantida pela tabela `mp_webhook_events` (PK composta `subscription_id + mp_status`). Duplicate key → ignora silenciosamente.

**[OK]** Status reconfirmado consultando `GET /preapproval/{id}` na API do MP — o corpo da notificação nunca é confiado diretamente.

**[ACAO MANUAL NECESSARIA]** Configurar o secret no Supabase:
```bash
supabase secrets set MP_WEBHOOK_SECRET="<webhook_secret_do_painel_mp>" --project-ref <REF>
```
Enquanto não configurado, a validação HMAC é pulada com aviso no log.

---

## 4. API PUBLICA v1

**[OK]** Chaves comparadas via SHA-256 (nunca texto puro).

**[OK]** `org_id` sempre derivado da chave no banco — nunca aceito do payload externo.

**[OK]** Rate limiting em memória: 60 req/min por key_hash.

**[CORRIGIDO]** Parâmetro `search` no `GET /customers` era interpolado diretamente em `.or(...)`, permitindo injeção de operadores PostgREST (ex.: `,email.eq.admin@other.org`). Correção: caracteres especiais `(`, `)`, `,` são removidos antes da interpolação.

---

## 5. EDGE FUNCTIONS — CORS

**[CORRIGIDO]** `create-subscription` e `invite-member` chamavam `corsPreflightResponse()` e `jsonResponse()` sem passar o objeto `req`, fazendo o header `Access-Control-Allow-Origin` retornar `http://localhost:5173` em produção (causaria CORS error no browser). Corrigido passando `req` em todas as chamadas.

**[OK]** `cors.ts` restringe origens a lista explícita + subdomínios `.vercel.app`. A API v1 usa `*` intencionalmente (server-to-server, autenticação via API key).

**[OK]** Nenhuma Edge Function concatena strings em queries SQL. Todas usam o SDK Supabase (queries parametrizadas).

---

## 6. send-email — Protecao contra spam

**[CORRIGIDO]** A Edge Function `send-email` tem `verify_jwt=false` (necessário para o fluxo público de aceite de orçamento). O template `orcamento-aceito` recebia apenas `org_id` no payload, permitindo que qualquer pessoa disparasse e-mails para owners de orgs arbitrárias conhecendo o UUID.

Correção: o campo `quote_token` (UUID público do orçamento) agora é obrigatório para este template. A função valida que o token pertence à org informada antes de prosseguir. O frontend (`quotes.ts`) foi atualizado para enviar o token automaticamente.

---

## 7. AUTENTICACAO E ADMIN

**[OK]** Status de super-admin verificado exclusivamente via `is_platform_admin()` (SECURITY DEFINER no banco). Nenhuma comparação de e-mail no frontend.

**[OK]** `platform_admins` com RLS ativo e sem policies públicas — inacessível diretamente por qualquer role.

**[ACAO MANUAL NECESSARIA]** Rate limiting no login (brute force) não é controlável no nível da aplicação com Supabase Auth — ativar o CAPTCHA no painel:
`Authentication > Settings > Enable CAPTCHA protection`

---

## Resumo das correcoes aplicadas no codigo

| Arquivo | Correc&#807;ao |
|---|---|
| `supabase/functions/create-subscription/index.ts` | Passa `req` para `corsPreflightResponse` e todos os `jsonResponse` |
| `supabase/functions/invite-member/index.ts` | Remove import `corsHeaders` não usado; passa `req` para todos os helpers CORS |
| `supabase/functions/api-v1/index.ts` | Sanitiza `search` removendo `(`, `)`, `,` antes de interpolar no filtro PostgREST |
| `supabase/functions/send-email/index.ts` | Exige `quote_token` para template `orcamento-aceito`; valida token no banco antes de enviar |
| `src/services/email.ts` | Adiciona campo `quote_token?` ao tipo `SendEmailPayload` |
| `src/services/quotes.ts` | Passa `token` como `quote_token` na chamada `sendEmail` |

---

## Acoes manuais pendentes

1. **MP_WEBHOOK_SECRET** — configurar no Supabase para ativar validacao HMAC do webhook:
   ```bash
   supabase secrets set MP_WEBHOOK_SECRET="<secret>" --project-ref <REF>
   ```

2. **CAPTCHA no login** — ativar no painel Supabase em `Authentication > Settings > Enable CAPTCHA protection` para proteger contra brute force.

3. **Migrations 0013 e 0014** — se ainda nao executadas no banco, rodar no SQL Editor do Supabase antes de usar convites e webhook MP.
