# FestaHub — Edge Functions

Duas Edge Functions gerenciam o ciclo de cobrança via Mercado Pago Assinaturas.

```
supabase/functions/
├── _shared/
│   ├── cors.ts       — cabeçalhos CORS + helpers de response
│   └── mp-api.ts     — tipos MP + fetcher genérico (sem segredos)
├── create-subscription/
│   └── index.ts      — cria preapproval MP (requer JWT de owner)
├── mp-webhook/
│   └── index.ts      — recebe notificações MP (verify_jwt = false)
└── README.md         — este arquivo
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

# Confirmar secrets registrados (os valores ficam ocultos)
supabase secrets list --project-ref <REF>
```

---

## 3. Deploy das funções

```bash
# Deploy de ambas as funções
supabase functions deploy create-subscription --project-ref <REF>
supabase functions deploy mp-webhook --project-ref <REF>

# Ou as duas de uma vez
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

## 7. Variáveis de ambiente no frontend

O frontend só precisa das variáveis públicas do Supabase (sem segredos MP):

```env
# .env.local (nunca commitado)
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

O `MP_ACCESS_TOKEN` **jamais** deve aparecer no frontend ou no `.env`.
