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

## Design System

### Paleta
| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#E8462A` | Botões, links, ativo na sidebar |
| `--color-primary-light` | `#FEF0EC` | Fundo de ícones, hover sutil |
| `--color-sidebar` | `#16131F` | Sidebar midnight |
| `--color-background` | `#FAF9F7` | Fundo da app (warm off-white) |
| `--color-success` | `#16A34A` | Dinheiro, status realizada |
| `--color-destructive` | `#DC2626` | Erros, ações destrutivas |
| Status orcamento | `#F59E0B` / `#FFFBEB` | Badge amber |
| Status confirmada | `#3B82F6` / `#EFF6FF` | Badge blue |
| Status realizada | `#16A34A` / `#F0FDF4` | Badge green |
| Status cancelada | `#78716C` / `#F5F5F4` | Badge stone |

### Tipografia
- **Display**: Sora (Google Fonts) — geométrica, moderna, headings e logo
- **Corpo**: Nunito (Google Fonts) — arredondada, amigável, texto geral

### Componentes base criados
- `PageHeader` — título + descrição + slot de ação
- `EmptyState` — ilustração SVG de balões + CTA
- `StatCard` — métrica com ícone, valor em display font, trend indicator
- `StatusBadge` — badge por status de festa/orçamento com cor e dot

### Backlog design
- Dark mode (decidido adiar; tokens já preparados para extensão futura)
- Code-splitting das rotas (bundle > 500 kB — tarefas futuras)

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
### 2026-06-11 — Landing Page de Conversão
**Feito nesta etapa:**
- `src/pages/Landing.tsx` — landing page completa em português, mobile-first: hero (headline + CalendarMockup CSS), seção de dores (3 cards), funcionalidades (4 FeaturePanel alternados com mockups CSS puros — AgendaMockupSmall, OrcamentoMockupSmall, FinanceiroMockupSmall, RadarMockupSmall), depoimentos com TODO, tabela de preços (Profissional em destaque com glow coral), FAQ com `<details>/<summary>` CSS-only, CTA banner e footer com links legais. Zero imagens externas.
- `src/pages/Termos.tsx` — Termos de Uso com 8 seções, marcados com TODO para revisão jurídica
- `src/pages/Privacidade.tsx` — Política de Privacidade conforme LGPD (10 seções), marcada com TODO para DPO e revisão jurídica
- `src/App.tsx` — rotas `/termos` e `/privacidade` adicionadas
- `index.html` — `lang="pt-BR"`, title, meta description, OG tags, Twitter Card, Google Fonts (Sora+Nunito) com `display=swap`
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

**Próximas tarefas sugeridas:**
- Substituir depoimentos placeholder (marcados com TODO) por reais
- Adicionar og:image e twitter:image (screenshot 1200×630px da plataforma)
- Nomear DPO e revisar Termos/Privacidade com assessoria jurídica
- Code-splitting das rotas (bundle > 1,3 MB)
- Vincular `event_id` no quote após "Converter em festa"

### 2026-06-11 — Paywall e Limites de Plano
**Feito nesta etapa:**
- `src/hooks/usePlan.ts` — hook `usePlan()`: expõe `{ plan, isTrial, trialDaysLeft, isActive, can(feature) }`. Trial ativo = `plan === 'trial' && trialDaysLeft > 0`; assinatura ativa = `subscription_status === 'active'`. Features: `public_quotes` (profissional/rede), `multiple_units` (rede), `multi_user` (profissional/rede)
- `src/services/orgs.ts` — adicionado `updateOrg(orgId, payload)` para editar nome/cidade/telefone via `.update()`
- `src/pages/app/AppLayout.tsx` — `SidebarPlanBadge`: badge dinâmico na sidebar (dias do trial ou "inativo"); `TrialBanner`: faixa amarela (≤7d) ou vermelha (expirado) acima do conteúdo; paywall redirect via `useEffect` + `useNavigate` → se `!isActive` redireciona para `/app/configuracoes`
- `src/pages/app/Configuracoes.tsx` — página completa: `OrgForm` (edita nome/cidade/telefone + máscara de telefone); `BillingSection` (status badge, alerta expirado/trial-curto, grid de 3 `PlanCard`); `PlanCard` (ícone, preço BRL, features, botão assinar → `startSubscription`)
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

**Próximas tarefas sugeridas:**
- Code-splitting das rotas (bundle > 1,2 MB)
- Vincular `event_id` no quote após "Converter em festa"
- Relatório financeiro PDF / exportação CSV

### 2026-06-10 — Cobrança Recorrente Mercado Pago (Edge Functions)
**Feito nesta etapa:**
- `supabase/config.toml` — configuração de funções: `create-subscription` com `verify_jwt=true`, `mp-webhook` com `verify_jwt=false` (MP não envia JWT)
- `supabase/functions/_shared/cors.ts` — `corsHeaders`, `corsPreflightResponse()`, `jsonResponse()` reutilizáveis
- `supabase/functions/_shared/mp-api.ts` — interfaces `MpPreapproval`, `MpPreapprovalCreateBody`, `MpAutoRecurring`, `MpResult<T>`; função `mpFetch<T>()` com header `Authorization: Bearer`, `X-Idempotency-Key` e tratamento de erro de rede + parse
- `supabase/functions/create-subscription/index.ts`:
  - Lê secrets via `Deno.env.get` (MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL)
  - Verifica JWT com `admin.auth.getUser(jwt)` (service role)
  - Valida `plan` ∈ {essencial, profissional, rede}
  - Verifica `memberships.role = 'owner'` antes de criar assinatura
  - `POST /preapproval` no MP: reason "FestaHub – {Plano}", auto_recurring mensal BRL (97/197/397), back_url, external_reference = org_id
  - Persiste `subscription_id`, `plan`, `subscription_status='pending'` na organização
  - Retorna `{ init_point, subscription_id }`
- `supabase/functions/mp-webhook/index.ts`:
  - `verify_jwt=false` (endpoint público para o MP)
  - Responde 200 imediatamente; processamento real em background (`void processWebhook(...)`)
  - Suporta formato v1 (`type: 'subscription_preapproval'`) e legado (`topic: 'preapproval'`)
  - **Segurança**: NUNCA confia no corpo do webhook — sempre verifica `GET /preapproval/{id}` na API do MP antes de aplicar mudança
  - Verifica existência da org via `external_reference` antes de atualizar
  - Mapeamento: authorized→active, paused/cancelled→inactive, pending→pending
  - Grava `audit_log` com `action='mp_webhook_processed'`
- `src/services/billing.ts` — `startSubscription(plan)`: invoca Edge Function via `supabase.functions.invoke` (auto-injeta JWT), recebe `init_point`, redireciona `window.location.href`; `PLANS[]` com preços em centavos para exibição; `getPlanInfo(planId)`
- `supabase/functions/README.md` — comandos exatos de deploy (`supabase functions deploy`), como setar os 2 secrets, URL do webhook no painel MP, fluxo completo, instruções de sandbox
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

**⚠️ Ações manuais necessárias (ver supabase/functions/README.md):**
1. `supabase functions deploy create-subscription --project-ref <REF>`
2. `supabase functions deploy mp-webhook --project-ref <REF>`
3. `supabase secrets set MP_ACCESS_TOKEN="APP_xxx..." --project-ref <REF>`
4. `supabase secrets set APP_URL="https://seu-dominio.com" --project-ref <REF>`
5. Cadastrar `https://<REF>.supabase.co/functions/v1/mp-webhook` no painel MP → Webhooks → evento `subscription_preapproval`

**Próximas tarefas sugeridas:**
- Página de planos em `/app/configuracoes` usando `startSubscription` e `PLANS`
- Code-splitting das rotas (bundle atual > 1,2 MB)
- Vincular `event_id` no quote após "Converter em festa"

### 2026-06-10 — Módulo Financeiro
**Feito nesta etapa:**
- `src/services/transactions.ts` — reescrito: `TRANSACTION_CATEGORIES` + `CATEGORY_LABELS` (Festa/Sinal/Alimentação/Equipe/Aluguel/Marketing/Outros), `listByPeriod` (filtros tipo/categoria/pago), `listLast6MonthsSummary` (agrupamento client-side, somas inteiras), `createTransaction`, `updateTransaction`, `removeTransaction`, `markPaid`; `createEventTransactions` preservado para compatibilidade com useEvents
- `src/components/financeiro/TransactionForm.tsx` — formulário create/edit: toggle tipo (receita/despesa) com cores, `Math.round(amount_reais * 100)` para centavos, categoria (Select), forma de pagamento, Switch pago + campo paid_at condicional; `Resolver<FormData, any>` cast para `z.coerce.number()`
- `src/components/financeiro/BarChart6Months.tsx` — gráfico recharts `BarChart` responsivo; dados em centavos; `tickFormatter` e `CustomTooltip` (nível de módulo) convertem para BRL só na exibição; saldo em verde/vermelho no tooltip
- `src/pages/app/Financeiro.tsx` — `SummaryCard`, `TransactionRow`, `DeleteDialog` em nível de módulo (Regra 2); seletor mês/ano com `ChevronLeft/Right`; 4 StatCards (Receitas/Despesas/Saldo/A receber com badge de vencidos em vermelho); `BarChart6Months`; tabela com filtros tipo+categoria+status; ação rápida "marcar como pago" (ícone hover); rodapé com totais; Dialog create/edit + Dialog delete
- Todas as somas monetárias via `reduce` com inteiros — zero aritmética float em valores monetários ✓
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

**Próximas tarefas sugeridas:**
- Code-splitting das rotas (bundle atual > 1,2 MB)
- Integração Mercado Pago Assinaturas
- Vincular `event_id` no quote após "Converter em festa"
- Relatório financeiro PDF / exportação CSV

### 2026-06-10 — Módulo Orçamentos com Link Público de Aceite
**Feito nesta etapa:**
- `supabase/migrations/0003_public_quote_actions.sql` — `ALTER TABLE quotes ADD COLUMN notes text` + RPC `update_public_quote_status(p_token, p_status)` SECURITY DEFINER com grant para `anon`
- `src/types/database.ts` — adicionado campo `notes: string | null` ao `Quote`
- `src/services/quotes.ts` — `listQuotes` (search + filtro status), `createQuote`, `updateQuote`, `removeQuote`, `getPublicQuote` (RPC existente), `updatePublicQuoteStatus` (nova RPC)
- `src/components/orcamentos/QuoteForm.tsx` — form com `useFieldArray` para itens dinâmicos (descrição, qtd, valor unit. em reais → centavos no payload), total calculado em tempo real, CustomerCombobox inline, zod
- `src/pages/app/Orcamentos.tsx` — lista com busca + filtro por status, botão "Copiar link" (copy + toast), link externo para página pública, menu ⋮ com editar/excluir/converter; banner de aceitos aguardando conversão; `EventDialog` pré-preenchido para converter orçamento em festa
- `src/components/agenda/EventDialog.tsx` — adicionado suporte à prop `prefill?: EventDialogPrefill` para pré-preencher customer_id + total ao converter orçamento
- `src/pages/OrcamentoPublico.tsx` — página pública `/orcamento/:token`: sem import de authStore; design caprichado (dark header, tabela de itens com totals, banner de status, botões de aceite/recusa com loading state, botão flutuante WhatsApp); lê via `get_public_quote` e escreve via `update_public_quote_status`
- `src/App.tsx` — adicionada rota `/orcamento/:token` fora do ProtectedRoute
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

**⚠️ Ação manual necessária:** executar `supabase/migrations/0003_public_quote_actions.sql` no SQL Editor do Supabase.

**Próximas tarefas sugeridas:**
- Módulo Financeiro (`/app/financeiro`) — dashboard receita/despesa, extrato por período
- Code-splitting das rotas (bundle atual > 880 kB)
- Integração Mercado Pago Assinaturas
- Vincular `event_id` no quote após "Converter em festa"

### 2026-06-10 — Módulo Clientes com Radar de Aniversários
**Feito nesta etapa:**
- `src/types/database.ts` — adicionado `CustomerWithStats` (extends Customer + total_spent_cents / events_count / last_event_date)
- `src/services/customers.ts` — reescrito: `listCustomers` (search + paginação 25/página + sort name/last_event client-side), `createCustomer`, `updateCustomer`, `removeCustomer` (bloqueia se houver festas vinculadas com `CustomerHasEventsError`), `listCustomerEvents`
- `src/hooks/useCustomers.ts` — atualizado para nova assinatura (retorna Customer[] flat para o combobox da Agenda)
- `src/lib/birthday.ts` — `daysUntilBirthday`, `ageAtNextBirthday`, `isBirthdaySoon`, `maskPhone`, `unmaskedPhone`, `whatsappLink`
- `src/components/ui/sheet.tsx` — Sheet slide-over reutilizável (usa Radix Dialog)
- `src/components/clientes/CustomerForm.tsx` — form com máscara de telefone + zod (nome, telefone, email, CPF, criança, data de nascimento, observações)
- `src/components/clientes/BirthdayRadar.tsx` — seção "Aniversários próximos" (45 dias): cards com urgência colorida, link WhatsApp, badge de dias restantes
- `src/components/clientes/CustomerDrawer.tsx` — drawer lateral: avatar, badge "Aniversário em Xd", stats (festas/total gasto/última festa), contatos com links, histórico de festas
- `src/pages/app/Clientes.tsx` — tabela com busca + sort (nome/última festa) + paginação, BirthdayRadar no topo, drawer de detalhes, dialogs de criação/edição/exclusão com soft-block
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

**Próximas tarefas sugeridas:**
- Módulo Financeiro (`/app/financeiro`) — dashboard receita/despesa, extrato por período
- Módulo Orçamentos (`/app/orcamentos`) — criar cotação, link público via RPC `get_public_quote`
- Code-splitting das rotas (bundle atual > 800 kB)
- Integração Mercado Pago Assinaturas

### 2026-06-10 — Módulo Agenda de Festas
**Feito nesta etapa:**
- `src/services/events.ts` — listByMonth, createEvent, updateEvent, removeEvent, updateEventStatus, confirmEventWithTransactions, detectConflicts
- `src/services/customers.ts` — listCustomers, createCustomer
- `src/services/packages.ts` — listPackages
- `src/services/transactions.ts` — createTransaction, createEventTransactions (sinal + restante automático)
- `src/hooks/useEvents.ts` — estado de festas do mês: addEvent, editEvent, deleteEvent, changeStatus, confirmWithTransactions
- `src/hooks/useCustomers.ts` — lista + addCustomer (atualiza estado local)
- `src/hooks/usePackages.ts` — lista de pacotes da org
- `src/components/ui/popover.tsx` — wrapper Radix Popover para o combobox
- `src/components/agenda/EventChip.tsx` — chip colorido por status para células do calendário
- `src/components/agenda/EventCard.tsx` — card com DropdownMenu: confirmar, sinal pago, realizada, cancelar, excluir
- `src/components/agenda/MonthCalendar.tsx` — grade mensal date-fns (domingo primeiro), chips por célula (máx 3 + overflow), hoje destacado, selecionado com ring
- `src/components/agenda/DayPanel.tsx` — painel lateral deslizante; overlay mobile; lista de EventCards do dia
- `src/components/agenda/EventListView.tsx` — lista com busca + filtro de status; agrupada por data
- `src/components/agenda/NewCustomerDialog.tsx` — mini-dialog criação inline de cliente (name, phone, child_name)
- `src/components/agenda/CustomerCombobox.tsx` — Popover com busca; botão "+ Cadastrar novo cliente" no rodapé
- `src/components/agenda/ConflictWarningDialog.tsx` — aviso de sobreposição com lista de conflitos e botão "Salvar mesmo assim"
- `src/components/agenda/EventDialog.tsx` — form create/edit: zod baseSchema + createSchema (data no passado proibida ao criar); validações hora fim > início, sinal ≤ total; integra CustomerCombobox, Select de pacote, Switch sinal pago; detectConflicts antes de salvar; pendingPayload para confirmar sobreposição
- `src/pages/app/Agenda.tsx` — orquestra tudo: Tabs (Calendário / Lista), navegação de mês, DayPanel, EventDialog, handlers de todas as ações rápidas
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

**Próximas tarefas sugeridas:**
- Módulo Clientes (`/app/clientes`) — CRUD completo com histórico de festas
- Módulo Financeiro (`/app/financeiro`) — dashboard receita/despesa, extrato por período
- Módulo Orçamentos (`/app/orcamentos`) — criar cotação, link público via RPC `get_public_quote`
- Code-splitting das rotas (bundle atual > 500 kB)
- Integração Mercado Pago Assinaturas

### 2026-06-10 — Design System FestaHub
**Feito nesta etapa:**
- `src/index.css` — tokens completos Tailwind v4 `@theme`: paleta coral+midnight+warm, fontes Sora+Nunito via Google Fonts, animações (fade-up, scale-in, float, spin-slow), scrollbar customizada, `prefers-reduced-motion`
- `src/components/PageHeader.tsx` — título em display font + descrição + slot de ação
- `src/components/EmptyState.tsx` — SVG inline de balões com animação float + CTA
- `src/components/StatCard.tsx` — card métrica com ícone colorido, valor em display font, trend up/down/neutral
- `src/components/StatusBadge.tsx` — badge com dot colorido para todos os status de evento e orçamento
- `src/pages/app/AppLayout.tsx` — sidebar midnight redesenhada (logo mark SVG, avatar inicial, badge trial), topbar com UserMenu com avatar
- `src/pages/Login.tsx` — split layout: painel coral (gradient + dots pattern + features) + form
- `src/pages/Cadastro.tsx` — split layout: painel midnight (gradient + stats grid) + form
- `src/pages/Onboarding.tsx` — progress stepper (3 passos) + card flutuante com sombra
- Páginas internas (Agenda/Clientes/Orçamentos/Financeiro/Configurações) — PageHeader + EmptyState aplicados
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

### 2026-06-10 — Auth + Onboarding multi-tenant
**Feito nesta etapa:**
- `src/services/auth.ts` — signUp, signIn, signOut, resetPassword, getSession
- `src/services/orgs.ts` — createOrgWithOwner, getMyOrgAndMembership
- `src/services/profiles.ts` — getProfile
- `src/stores/authStore.ts` — zustand: session/user/profile/organization/membership/loading; initialize() com onAuthStateChange; refreshOrg(); clear()
- `src/pages/Login.tsx` — react-hook-form + zod, erros em PT-BR, visual shadcn
- `src/pages/Cadastro.tsx` — idem, com confirmação de senha
- `src/pages/Onboarding.tsx` — cria org + membership owner; redireciona para /app/agenda
- `src/components/ProtectedRoute.tsx` — sem sessão → /login; sem org → /onboarding
- `src/pages/app/AppLayout.tsx` — sidebar desktop + drawer mobile (hamburger), topbar com UserMenu (nome, sair)
- App.tsx — initialize() no useEffect; rota /onboarding adicionada; /app envolto em ProtectedRoute
- `npx tsc --noEmit` → zero erros ✓ | `npm run build` → sucesso ✓

**Fluxos testados mentalmente:**
1. Cadastro novo → confirmação de e-mail → Login → sem org → /onboarding → preenche dados → /app/agenda ✓
2. Login usuário existente com org → direto /app/agenda ✓
3. Login usuário existente sem org (edge case) → /onboarding ✓
4. Acesso direto a /app sem sessão → /login ✓
5. Acesso direto a /app com sessão mas sem org → /onboarding ✓
6. Sair → clear() store → /login ✓
7. Loading state → spinner centralizado enquanto getSession carrega ✓

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
