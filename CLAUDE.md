# FestaHub — Memória do Projeto

## O que é
SaaS multi-tenant de gestão para buffets infantis e brinquedotecas no Brasil. React + Vite + TypeScript + Tailwind + shadcn/ui no frontend; Supabase (Postgres, Auth, RLS, Edge Functions) no backend; Mercado Pago Assinaturas para cobrança; deploy na Vercel. Idioma da UI: português do Brasil. Moeda: BRL.

## Regras INEGOCIÁVEIS de código
1. TypeScript estrito. Proibido `any` sem justificativa em comentário.
2. NUNCA definir um componente React dentro do corpo de outro componente (causa violação de hooks).
3. NUNCA chamar hooks condicionalmente.
4. Todas as queries ao Supabase passam por funções em `src/services/`, nunca direto no componente.
5. Toda tabela do banco tem coluna `org_id uuid not null` e política RLS filtrando por organização do usuário. Sem exceção.
6. Datas sempre em ISO no banco; exibição com date-fns no fuso America/Sao_Paulo.
7. Dinheiro sempre em centavos (integer) no banco; formatar com Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).
8. Componentes em src/components/, páginas em src/pages/, hooks em src/hooks/, tipos em src/types/.
9. Nenhum segredo no código. Tudo via variáveis de ambiente (.env nunca commitado).
10. Antes de encerrar QUALQUER tarefa: rodar `npx tsc --noEmit` e `npm run build`. Só encerrar com ZERO erros. Se houver erro, corrigir e rodar de novo até passar.

## Schema do banco (resumo)
9 tabelas Postgres com RLS multi-tenant:
- **organizations** — conta/empresa (planos: trial/essencial/profissional/rede)
- **profiles** — espelha auth.users 1:1 (trigger automático no signup)
- **memberships** — liga user↔org com role (owner/admin/atendente)
- **customers** — clientes da org, com dados da criança
- **packages** — pacotes de festa com preço base em centavos
- **events** — festas com status (orcamento/confirmada/realizada/cancelada), valores em centavos
- **quotes** — orçamentos com token público UUID para link externo
- **transactions** — financeiro (receita/despesa), valores em centavos
- **audit_log** — trilha de auditoria
Helper `user_org_ids()` SECURITY DEFINER filtra tudo por org do usuário.
RPC `get_public_quote(token)` para link público sem login (SECURITY DEFINER, acessível ao role `anon`).

## Estado atual
### 2026-06-10 — Schema completo com RLS
**Feito nesta etapa:**
- `supabase/migrations/0001_schema.sql` — 9 tabelas, RLS em todas, função helper `user_org_ids()`, trigger `handle_new_user`, RPC `get_public_quote`, índices
- `supabase/migrations/0002_seed_dev.sql` — 1 org, 3 clientes, 2 pacotes, 4 festas, 6 transações (só para dev)
- `src/types/database.ts` — todos os tipos TypeScript espelhando o schema
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

### 2026-06-10 — Scaffold completo
**Feito:**
- Vite + React 18 + TypeScript estrito configurado (alias `@` → `src/`)
- Tailwind CSS v4 via `@tailwindcss/vite` (sem `tailwind.config.js` — abordagem v4)
- Variáveis de tema CSS em `src/index.css` com `@theme`
- shadcn/ui instalado manualmente (CLI incompatível com project references): button, input, card, label, textarea, badge, dialog, select, tabs, dropdown-menu, switch, table, form
- `src/lib/supabase.ts` com client Supabase via env vars
- `.env.example` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- React Router com todas as rotas: `/`, `/login`, `/cadastro`, `/app/*`
- Layout protegido (`AppLayout`) com sidebar de navegação
- Zustand, react-hook-form, zod, @hookform/resolvers, sonner instalados
- `npx tsc --noEmit` → zero erros ✓
- `npm run build` → sucesso ✓

**Falta:**
- Autenticação real (Supabase Auth)
- Implementação das páginas (agenda, clientes, orçamentos, financeiro, configurações)
- Integração Mercado Pago
- Migrations do banco Supabase

**Decisões:**
- shadcn configurado manualmente (CLI v4.x incompatível com tsconfig project references)
- Tailwind v4 usa `@theme` em CSS em vez de `tailwind.config.js`
- `ignoreDeprecations: "6.0"` necessário para `baseUrl` no TS 5.x

## Comandos
- dev: npm run dev
- build: npm run build
- typecheck: npx tsc --noEmit
