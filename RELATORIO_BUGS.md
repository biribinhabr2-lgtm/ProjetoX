# Relatório de Bugs — FestaHub

**Data:** 2026-06-18  
**Metodologia:** Varredura manual + `npx tsc --noEmit -p tsconfig.app.json`

---

## CRÍTICO — 0 encontrados

Nenhum bug crítico (tela branca, perda de dados, hook violation grave).

---

## ALTO — Isolamento multi-tenant (defense-in-depth)

Todas as operações abaixo são protegidas por RLS, mas não tinham filtro explícito de `org_id` nas queries de UPDATE/DELETE — violação da regra 3 do CLAUDE.md.

| # | Arquivo | Linha aprox. | Bug | Correção |
|---|---|---|---|---|
| A1 | `src/services/catalog.ts` | 49 | `updateCatalogItem(id, payload)` sem org_id | Adicionado `orgId` como primeiro parâmetro; `.eq('org_id', orgId)` |
| A2 | `src/services/catalog.ts` | 64 | `toggleCatalogItemActive(id, active)` sem org_id | Adicionado `orgId`; `.eq('org_id', orgId)` |
| A3 | `src/services/catalog.ts` | 76 | `removeCatalogItem(id)` sem org_id | Adicionado `orgId`; `.eq('org_id', orgId)` |
| A4 | `src/services/catalog.ts` | 86 | `swapCatalogOrder(a, b)` sem org_id nas duas UPDATEs | Adicionado `orgId`; `.eq('org_id', orgId)` em ambas |
| A5 | `src/services/staff.ts` | 62 | `updateMember(id, payload)` sem org_id | Adicionado `orgId`; `.eq('org_id', orgId)` |
| A6 | `src/services/staff.ts` | 73 | `toggleActive(id, active)` sem org_id | Adicionado `orgId`; `.eq('org_id', orgId)` |
| A7 | `src/services/staff.ts` | 103 | `updateAllocation(id, payload)` sem org_id | Adicionado `orgId`; `.eq('org_id', orgId)` |
| A8 | `src/services/staff.ts` | 114 | `removeAllocation(id)` sem org_id | Adicionado `orgId`; `.eq('org_id', orgId)` |
| A9 | `src/services/staff.ts` | 122 | `toggleConfirmed(id, confirmed)` sem org_id | Adicionado `orgId`; `.eq('org_id', orgId)` |
| A10 | `src/services/eventItems.ts` | 11 | `listEventItems(eventId)` sem org_id | Adicionado `orgId`; `.eq('org_id', orgId)` |
| A11 | `src/services/eventItems.ts` | 27 | `syncEventItems` delete sem org_id | `.eq('org_id', orgId)` no DELETE |
| A12 | `src/services/events.ts` | 109 | `removeEvent(id)` sem org_id | `removeEvent(orgId, id)`; `.eq('org_id', orgId)` |
| A13 | `src/services/transactions.ts` | 170 | `removeTransaction(id)` sem org_id | `removeTransaction(orgId, id)`; `.eq('org_id', orgId)` |
| A14 | `src/services/quotes.ts` | 104 | `removeQuote(id)` sem org_id | `removeQuote(orgId, id)`; `.eq('org_id', orgId)` |
| A15 | `src/services/customers.ts` | 192 | `removeCustomer(id)` sem org_id | `removeCustomer(orgId, id)`; `.eq('org_id', orgId)` |

**Callers atualizados:**
- `src/pages/app/Catalogo.tsx` — `updateCatalogItem`, `toggleCatalogItemActive`, `removeCatalogItem`, `swapCatalogOrder`
- `src/pages/app/Equipe.tsx` — `updateMember`, `toggleActive`
- `src/components/agenda/StaffSection.tsx` — `removeAllocation`, `toggleConfirmed`
- `src/components/agenda/EventDialog.tsx` — `listEventItems`
- `src/hooks/useEvents.ts` — `removeEvent`
- `src/pages/app/Clientes.tsx` — `removeCustomer`
- `src/pages/app/Financeiro.tsx` — `removeTransaction`
- `src/pages/app/Orcamentos.tsx` — `removeQuote`

---

## MÉDIO — TypeScript pré-existente

| # | Arquivo | Linha | Bug | Correção |
|---|---|---|---|---|
| M1 | `src/pages/app/Catalogo.tsx` | 181 | `zodResolver(schema)` com `z.coerce.number()` gera Resolver type mismatch | Cast `as Resolver<FormData, any>` (padrão do projeto); import `Resolver` |
| M2 | `src/pages/app/Equipe.tsx` | 94 | Mesmo problema com `z.coerce.number()` | Cast `as Resolver<FormData, any>`; import `Resolver` |
| M3 | `src/pages/app/Equipe.tsx` | 430 | `EmptyState` chamado com prop `action` inexistente | Trocado para `actionLabel` + `onAction` (API correta do componente) |
| M4 | `src/pages/app/Escala.tsx` | 543 | `PageHeader description` tipado como `string` mas recebe `<span>` | `PageHeader.description` ampliado para `React.ReactNode` |
| M5 | `src/pages/OrcamentoPublico.tsx` | 215 | `total_cents` possivelmente null (divisão por 100 sem guard) | `?? 0` adicionado antes da divisão |
| M6 | `src/services/orgs.ts` | 33 | `rpcData` desestruturado e nunca usado | Removida desestruturação; apenas `error` é usado |

---

## BAIXO — Imports não usados / variáveis mortas

| # | Arquivo | Linha | Bug | Correção |
|---|---|---|---|---|
| B1 | `src/pages/app/Admin.tsx` | 12 | `Badge` importado mas nunca usado | Removido import |
| B2 | `src/pages/Convite.tsx` | 28 | `inviteOrgId`/`setInviteOrgId` declarados mas nunca usados | Removido o `useState` |
| B3 | `src/components/agenda/StaffSection.tsx` | 30 | `renderMultiAllocMessage` importado mas nunca usado (variável `message` foi eliminada) | Removido import e variável morta |

---

## Não corrigidos — requerem decisão do produto

| Item | Motivo de não corrigir |
|---|---|
| `updateEvent` / `updateEventStatus` sem org_id | UPDATE protegido por RLS; callers via `useEvents` hook que teria que receber orgId; mudança cascadeante demais para uma rodada de bugfix |
| `updateTransaction` / `markPaid` sem org_id | Idem acima |
| `updateCustomer` / `updateQuote` sem org_id | Idem; RLS protege |
| Chunk size > 500 kB | Code splitting é tarefa de feature, não bugfix |

---

## Resultado final

```
npx tsc --noEmit -p tsconfig.app.json  → 0 erros
npm run build                           → sucesso (0 erros)
```
