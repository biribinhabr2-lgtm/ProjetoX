# FestaHub

SaaS multi-tenant de gestão para buffets infantis e brinquedotecas no Brasil.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript (strict) |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Autenticação | Supabase Auth |
| Banco de dados | Supabase (Postgres 15 + RLS) |
| Backend serverless | Supabase Edge Functions (Deno) |
| Pagamentos | Mercado Pago Assinaturas |
| E-mails transacionais | Resend |
| Deploy frontend | Vercel |

## Funcionalidades

- **Agenda** — calendário mensal, detecção de conflitos, status de festa (orçamento → confirmada → realizada)
- **Clientes** — CRUD com radar de aniversários (45 dias), histórico de festas
- **Orçamentos** — link público de aceite/recusa sem login
- **Financeiro** — receitas/despesas, gráfico 6 meses, filtros por período e categoria
- **Assinatura** — planos Essencial/Profissional/Rede via Mercado Pago, paywall e trial de 14 dias
- **E-mails** — boas-vindas, trial acabando, notificação de orçamento aceito (via Resend)

## Como rodar local

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) com projeto criado
- Migrations executadas (ver abaixo)

### Instalação

```bash
git clone <repo>
cd festahub
npm install
cp .env.example .env.local
# Preencha as variáveis de ambiente (ver seção abaixo)
npm run dev
```

O app abre em `http://localhost:5173`.

### Executar as migrations

No SQL Editor do painel Supabase, execute na ordem:

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_seed_dev.sql   # opcional — dados de desenvolvimento
supabase/migrations/0003_public_quote_actions.sql
```

## Variáveis de ambiente

Crie `.env.local` (nunca commitar):

```env
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> O `RESEND_API_KEY` e o `MP_ACCESS_TOKEN` ficam exclusivamente como Supabase Secrets nas Edge Functions — nunca no frontend.

## Edge Functions

Três funções em `supabase/functions/`:

| Função | Descrição |
|---|---|
| `create-subscription` | Cria assinatura no Mercado Pago (requer JWT) |
| `mp-webhook` | Recebe notificações do MP e atualiza status da org |
| `send-email` | Envia e-mails transacionais via Resend |

Para fazer deploy e configurar secrets, veja [`supabase/functions/README.md`](supabase/functions/README.md).

## Deploy (Vercel)

1. Importe o repositório no painel da Vercel
2. Framework Preset: **Vite**
3. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
4. Deploy automático a cada push na branch `main`

## Comandos úteis

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npx tsc --noEmit     # verificação de tipos sem emitir arquivos
```

## Estrutura do projeto

```
src/
├── components/      # componentes reutilizáveis
│   ├── ui/          # shadcn/ui base
│   ├── agenda/      # componentes do módulo Agenda
│   ├── clientes/    # componentes do módulo Clientes
│   ├── orcamentos/  # componentes do módulo Orçamentos
│   └── financeiro/  # componentes do módulo Financeiro
├── hooks/           # hooks customizados
├── pages/           # páginas (roteadas pelo React Router)
│   └── app/         # páginas autenticadas
├── services/        # toda comunicação com Supabase (Regra 4)
├── stores/          # estado global (Zustand)
├── types/           # tipos TypeScript
└── lib/             # utilitários (supabase client, birthday helpers)

supabase/
├── functions/       # Edge Functions (Deno)
└── migrations/      # SQL das migrations
```
