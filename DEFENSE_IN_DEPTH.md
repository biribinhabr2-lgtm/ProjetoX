# Defense-in-Depth — Filtro explícito org_id em writes

**Data:** 2026-06-18

---

## Estratégia adotada: assinaturas MANTIDAS — org_id obtido via `useAuthStore.getState()`

**Por quê:** Zustand expõe `getState()` como método estático do store, acessível fora de componentes React e fora de hooks. O projeto já usa `useAuthStore` como fonte única de `organization.id`. Chamar `useAuthStore.getState().organization?.id` dentro das funções de serviço obtém o mesmo valor que os componentes usam, sem criar mecanismo paralelo e sem mudar nenhuma assinatura.

**Zero chamadores alterados.** Todas as páginas que chamam essas funções continuam iguais.

---

## Funções modificadas

| Função | Arquivo | Filtro adicionado | Tratamento 0 linhas |
|---|---|---|---|
| `updateEvent` | `src/services/events.ts` | `.eq('org_id', orgId)` | Lança `"Registro não encontrado ou sem permissão"` |
| `updateEventStatus` | `src/services/events.ts` | Delega para `updateEvent` — coberta indiretamente | Idem |
| `updateTransaction` | `src/services/transactions.ts` | `.eq('org_id', orgId)` | Lança `"Registro não encontrado ou sem permissão"` |
| `markPaid` | `src/services/transactions.ts` | Delega para `updateTransaction` — coberta indiretamente | Idem |
| `updateCustomer` | `src/services/customers.ts` | `.eq('org_id', orgId)` | Lança `"Registro não encontrado ou sem permissão"` |
| `updateQuote` | `src/services/quotes.ts` | `.eq('org_id', orgId)` | Lança `"Registro não encontrado ou sem permissão"` |

---

## Padrão aplicado em cada função

```ts
const orgId = useAuthStore.getState().organization?.id
if (!orgId) throw new Error('Organização não encontrada na sessão')

const { data, error } = await supabase
  .from('tabela')
  .update(payload)
  .eq('id', id)
  .eq('org_id', orgId)   // ← filtro explícito
  .select(...)            // ← .single() substituído por array

if (error) throw error
if (!data || data.length === 0) throw new Error('Registro não encontrado ou sem permissão')
return data[0] as T
```

**Por que remover `.single()`:** `.single()` lança PGRST116 quando 0 linhas, mas com mensagem técnica do PostgREST. Substituir por array + checagem manual permite mensagem clara em português para a UI.

---

## Verificação de dependência circular

`authStore.ts` importa apenas de `services/profiles.ts` e `services/orgs.ts`. Os quatro arquivos modificados (`events.ts`, `transactions.ts`, `customers.ts`, `quotes.ts`) não são importados por nenhum deles — sem ciclo.

---

## Chamadores que precisaram mudar

**Nenhum.** Assinaturas idênticas.

---

## Resultado

```
npx tsc --noEmit -p tsconfig.app.json  → 0 erros
npm run build                           → sucesso
```
