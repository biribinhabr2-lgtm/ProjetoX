# FestaHub — Edge Functions

Três Edge Functions: cobrança recorrente via Mercado Pago + e-mails transacionais via Resend.

```
supabase/functions/
├── _shared/
│   ├── cors.ts             — cabeçalhos CORS + helpers de response
│   └── mp-api.ts           — tipos MP + fetcher genérico (sem segredos)
├── create-subscription/
│   └── index.ts            — cria preapproval MP (requer JWT de owner)
├── mp-webhook/
│   └── index.ts            — recebe notificações MP (verify_jwt = false)
├── send-email/
│   └── index.ts            — e-mails transacionais via Resend (verify_jwt = false)
└── README.md               — este arquivo
```

---

## 1. Pré-requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e autenticado (`supabase login`)
- Projeto Supabase vinculado (`supabase link --project-ref <REF>`)
- Conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
  com **credenciais de Produção** (ou Sandbox para testes)

---

## 2. Secrets necessários

> ⚠️ **Jamais coloque esses valores no código-fonte ou no `.env`.**

| Secret                       | Onde obter |
|------------------------------|------------|
| `MP_ACCESS_TOKEN`            | [Painel MP → Suas integrações → Credenciais de produção](https://www.mercadopago.com.br/developers/panel/app) → **Access token** |
| `APP_URL`                    | URL base do frontend em produção, ex: `https://festahub.vercel.app` (sem barra final) |
| `RESEND_API_KEY`             | [Resend Dashboard](https://resend.com/api-keys) → Create API Key |
| `SUPABASE_URL`               | Injetado automaticamente pelo runtime — **não precisa setar** |
| `SUPABASE_SERVICE_ROLE_KEY`  | Injetado automaticamente pelo runtime — **não precisa setar** |

### Comandos para setar os secrets

```bash
# Substitua <REF> pelo project ref do seu projeto Supabase
# (visível em Project Settings → General → Reference ID)

supabase secrets set MP_ACCESS_TOKEN="APP_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --project-ref <REF>

supabase secrets set APP_URL="https://festahub.vercel.app" \
  --project-ref <REF>

supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --project-ref <REF>

# Confirmar secrets registrados (os valores ficam ocultos)
supabase secrets list --project-ref <REF>
```

---

## 3. Deploy das funções

```bash
# Deploy individual
supabase functions deploy create-subscription --project-ref <REF>
supabase functions deploy mp-webhook --project-ref <REF>
supabase functions deploy send-email --project-ref <REF>

# Ou todas de uma vez
supabase functions deploy --project-ref <REF>
```

Após o deploy, as URLs ficam em:
```
https://<REF>.supabase.co/functions/v1/create-subscription
https://<REF>.supabase.co/functions/v1/mp-webhook
```

---

## 4. Cadastrar o webhook no Mercado Pago

1. Acesse o [Painel do MP → Suas integrações → Webhooks](https://www.mercadopago.com.br/developers/panel/app)
2. Clique em **Configurar notificações**
3. Em **URL de produção**, insira:
   ```
   https://<REF>.supabase.co/functions/v1/mp-webhook
   ```
4. Em **Eventos**, marque **Assinaturas** (`subscription_preapproval`)
5. Salve e clique em **Simular** para testar a conectividade

> O MP faz uma requisição GET de verificação ao salvar o webhook — a função
> responde `200 OK` para esse caso automaticamente.

---

## 5. Fluxo completo de assinatura

```
Usuário clica em "Assinar Plano X"
  → frontend: billing.startSubscription('essencial')
    → invoke('create-subscription', { plan: 'essencial' })
      → Edge Function valida JWT + verifica ownership
      → POST /preapproval no MP → retorna { init_point, id }
      → persiste subscription_id + plan='essencial' + status='pending' na org
    → frontend: window.location.href = init_point
      → usuário paga no checkout do MP
        → MP: redireciona para APP_URL/app/configuracoes?sub=ok
        → MP: POST /mp-webhook com { type: 'subscription_preapproval', data: { id } }
          → Edge Function busca GET /preapproval/{id} na API MP para verificar
          → atualiza organizations.subscription_status = 'active'
          → grava audit_log
```

---

## 6. Testes em Sandbox

Para testar sem cobranças reais:

1. No painel do MP, use as **Credenciais de teste** (Access token começa com `TEST-`)
2. Use o `APP_URL` apontando para `localhost` ou um ngrok/tunnel:
   ```bash
   supabase secrets set MP_ACCESS_TOKEN="TEST-xxxx" --project-ref <REF>
   supabase secrets set APP_URL="https://meu-ngrok.ngrok.io" --project-ref <REF>
   ```
3. Use um e-mail de [usuário de teste MP](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-test/test-users) para simular o pagamento

---

## 7. E-mails transacionais (send-email)

### Templates disponíveis

| Template | Quando disparar | Destinatário |
|---|---|---|
| `boas-vindas` | Após onboarding — org criada | E-mail do usuário (`to` obrigatório) |
| `trial-acabando` | 3 dias antes do trial expirar | E-mail do owner (`to` obrigatório) |
| `orcamento-aceito` | Cliente clica em "Aceitar" no link público | Owner da org (buscado server-side via `org_id`) |

### Payload da função

```json
{
  "to": "usuario@exemplo.com",        // obrigatório exceto para orcamento-aceito
  "template": "boas-vindas",
  "data": {
    "name": "Maria",
    "org_name": "Buffet das Estrelas"
  }
}
```

Para `orcamento-aceito`, passe `data.org_id` em vez de `to` — a função busca o e-mail do owner internamente:

```json
{
  "template": "orcamento-aceito",
  "data": {
    "org_id":       "uuid-da-org",
    "org_name":     "Buffet das Estrelas",
    "customer_name": "João Silva",
    "total":        "R$ 1.500,00"
  }
}
```

### Disparos automáticos no app

- **boas-vindas**: `src/pages/Onboarding.tsx` — logo após `refreshOrg()`, fire-and-forget
- **orcamento-aceito**: `src/services/quotes.ts → updatePublicQuoteStatus()` — disparado quando `status === 'aceito'` e RPC retorna `ok: true`

### Cron para trial-acabando (passo manual)

O Supabase ainda não tem cron nativo (pg_cron fica no banco, não em Edge Functions).
Até a funcionalidade estar disponível, configure um cron externo (GitHub Actions, Render Cron, etc.)
que chame a função diariamente:

```bash
# Exemplo com curl (rode de um GitHub Actions workflow às 09h)
curl -X POST "https://<REF>.supabase.co/functions/v1/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "<OWNER_EMAIL>",
    "template": "trial-acabando",
    "data": { "name": "<NAME>", "org_name": "<ORG>", "days_left": "3" }
  }'
```

Futuramente: buscar todas as orgs com `trial_ends_at = now() + 3 days` e disparar em lote.

---

## 8. Variáveis de ambiente no frontend

O frontend só precisa das variáveis públicas do Supabase (sem segredos MP):

```env
# .env.local (nunca commitado)
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

O `MP_ACCESS_TOKEN` **jamais** deve aparecer no frontend ou no `.env`.
