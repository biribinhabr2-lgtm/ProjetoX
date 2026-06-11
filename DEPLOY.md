# FestaHub — Guia de Deploy

Siga esta lista **na ordem**. Cada seção tem um checklist no final.

---

## 1. Subir o repositório para o GitHub

### 1.1 Criar o repositório no GitHub

1. Acesse **[github.com/new](https://github.com/new)**
2. Nome sugerido: `festahub`
3. Visibilidade: **Private**
4. **Não** marque "Add a README" (o projeto já tem um)
5. Clique em **Create repository**

### 1.2 Conectar e fazer push

Execute no terminal (PowerShell), dentro da pasta do projeto:

```powershell
git remote add origin https://github.com/SEU_USUARIO/festahub.git
git branch -M main
git push -u origin main
```

> Substitua `SEU_USUARIO` pelo seu usuário do GitHub.
> Se pedir autenticação, use um **Personal Access Token** (PAT):
> GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic) → marque `repo` → copie o token e use como senha.

**Verificar:** acesse `https://github.com/SEU_USUARIO/festahub` — o código deve aparecer.

---

## 2. Deploy na Vercel

### 2.1 Importar o projeto

1. Acesse **[vercel.com/new](https://vercel.com/new)**
2. Conecte sua conta GitHub se ainda não conectou
3. Clique em **Import** no repositório `festahub`
4. Framework Preset será detectado como **Vite** automaticamente
5. **Não altere** Build Command (`npm run build`) nem Output Directory (`dist`) — o `vercel.json` já configura tudo

### 2.2 Configurar variáveis de ambiente

Ainda na tela de importação (antes de clicar em Deploy), expanda **Environment Variables** e adicione:

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://mjnjxhtkfmwhzatgpbox.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | sua anon key (painel Supabase → Project Settings → API → `anon public`) |

> **Importante:** a anon key é pública por design — é seguro adicioná-la aqui.
> Nunca adicione `RESEND_API_KEY` ou `MP_ACCESS_TOKEN` aqui; eles ficam exclusivamente nos Supabase Secrets.

6. Clique em **Deploy**

**Verificar:** após o deploy, a Vercel exibe uma URL no formato `https://festahub-xxxx.vercel.app`. Abra-a e confirme que o app carrega.

### 2.3 Atualizando após mudanças no código

Todo `git push origin main` dispara um novo deploy automaticamente. Nenhuma ação manual necessária.

---

## 3. Configurar domínio próprio

### 3.1 Adicionar o domínio na Vercel

1. No painel Vercel → seu projeto → **Settings → Domains**
2. Digite `festahub.com.br` e clique em **Add**
3. A Vercel vai exibir os registros DNS necessários (normalmente um registro `A` ou `CNAME`)

### 3.2 Configurar DNS no registrador

Acesse o painel do seu registrador de domínio (Registro.br, GoDaddy, Namecheap, etc.) e adicione os registros indicados pela Vercel. Exemplos comuns:

**Se a Vercel indicar CNAME (subdomínio):**
```
Tipo:  CNAME
Nome:  www
Valor: cname.vercel-dns.com
```

**Se a Vercel indicar registro A (domínio raiz):**
```
Tipo:  A
Nome:  @
Valor: 76.76.21.21
```

> A propagação DNS pode levar de alguns minutos até 48 horas.

**Verificar:** aguarde a Vercel exibir o status **Valid Configuration** ao lado do domínio.

---

## 4. Configurar Supabase Auth — URLs permitidas

Sem esta configuração, o login por e-mail (confirmação, reset de senha) vai falhar em produção.

1. Acesse **[supabase.com](https://supabase.com)** → seu projeto
2. Vá em **Authentication → URL Configuration**
3. Configure:

| Campo | Valor |
|---|---|
| **Site URL** | `https://festahub.com.br` |
| **Redirect URLs** | Adicione as seguintes linhas: |

```
https://festahub.com.br/**
https://festahub-*.vercel.app/**
http://localhost:5173/**
```

> O padrão `/**` cobre todas as rotas do app (agenda, onboarding, etc.).
> Inclua a URL da Vercel (`festahub-*.vercel.app`) para que preview deploys também funcionem.

4. Clique em **Save**

---

## 5. Configurar Resend para produção

Enquanto o domínio `festahub.com.br` não estiver verificado no Resend, os e-mails saem de `onboarding@resend.dev` e só chegam ao seu próprio e-mail. Para enviar para qualquer cliente:

1. Acesse **[resend.com/domains](https://resend.com/domains)** → **Add Domain** → `festahub.com.br`
2. Adicione os registros DNS exibidos (TXT de verificação + MX + DKIM) no seu registrador
3. Aguarde a verificação (geralmente < 10 minutos após propagação DNS)
4. Após verificado, avise para trocar o `from` na Edge Function de `onboarding@resend.dev` para `noreply@festahub.com.br` e fazer redeploy:

```powershell
# No diretório do projeto, após trocar o from no código:
supabase functions deploy send-email --project-ref mjnjxhtkfmwhzatgpbox
```

---

## 6. Checklist final pré-lançamento

Marque cada item conforme for concluindo:

### Banco de dados (Supabase)
- [ ] Migration `0001_schema.sql` executada no SQL Editor
- [ ] Migration `0003_public_quote_actions.sql` executada no SQL Editor
- [ ] (Opcional) Migration `0002_seed_dev.sql` executada apenas em ambiente de dev — **não executar em produção**

### Edge Functions (Supabase)
- [ ] `supabase functions deploy create-subscription --project-ref mjnjxhtkfmwhzatgpbox`
- [ ] `supabase functions deploy mp-webhook --project-ref mjnjxhtkfmwhzatgpbox`
- [ ] `supabase functions deploy send-email --project-ref mjnjxhtkfmwhzatgpbox`

### Secrets (Supabase)
- [ ] `MP_ACCESS_TOKEN` setado (`supabase secrets set MP_ACCESS_TOKEN="APP_xxx" --project-ref mjnjxhtkfmwhzatgpbox`)
- [ ] `APP_URL` setado com URL de produção (`supabase secrets set APP_URL="https://festahub.com.br" --project-ref mjnjxhtkfmwhzatgpbox`)
- [ ] `RESEND_API_KEY` setado (`supabase secrets set RESEND_API_KEY="re_xxx" --project-ref mjnjxhtkfmwhzatgpbox`)

### Mercado Pago
- [ ] Webhook cadastrado no painel MP apontando para `https://mjnjxhtkfmwhzatgpbox.supabase.co/functions/v1/mp-webhook`
- [ ] Evento `subscription_preapproval` marcado no webhook
- [ ] Testado com credenciais de sandbox antes de ativar produção

### Vercel
- [ ] Repositório conectado e deploy bem-sucedido
- [ ] `VITE_SUPABASE_URL` configurado nas env vars
- [ ] `VITE_SUPABASE_ANON_KEY` configurado nas env vars
- [ ] Domínio `festahub.com.br` configurado e verificado

### Supabase Auth
- [ ] Site URL atualizada para `https://festahub.com.br`
- [ ] Redirect URLs configuradas (produção + Vercel preview + localhost)

### Resend
- [ ] Domínio `festahub.com.br` verificado
- [ ] `from` da Edge Function trocado para `noreply@festahub.com.br` e redeployado

### Antes de anunciar o lançamento
- [ ] Cadastro completo testado em produção (signup → onboarding → agenda)
- [ ] Link público de orçamento testado
- [ ] Assinatura MP testada em sandbox
- [ ] E-mail de boas-vindas recebido
- [ ] Termos de Uso e Privacidade revisados por assessoria jurídica (marcados como TODO no código)
- [ ] DPO nomeado (exigido pela LGPD)
