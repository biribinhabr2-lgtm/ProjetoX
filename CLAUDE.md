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

## Estado atual
(atualize esta seção ao fim de cada tarefa: o que foi feito, o que falta, decisões tomadas)

## Comandos
- dev: npm run dev
- build: npm run build
- typecheck: npx tsc --noEmit
