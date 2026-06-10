-- ============================================================
-- FestaHub — Seed de DESENVOLVIMENTO
-- ⚠️  NUNCA executar em produção.
-- Execute no SQL Editor do Supabase apenas em projeto de dev/staging.
-- ============================================================

do $$
declare
  v_org_id       uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_user_id      uuid := 'bbbbbbbb-0000-0000-0000-000000000001';

  v_cust1        uuid := gen_random_uuid();
  v_cust2        uuid := gen_random_uuid();
  v_cust3        uuid := gen_random_uuid();

  v_pkg1         uuid := gen_random_uuid();
  v_pkg2         uuid := gen_random_uuid();

  v_evt1         uuid := gen_random_uuid();
  v_evt2         uuid := gen_random_uuid();
  v_evt3         uuid := gen_random_uuid();
  v_evt4         uuid := gen_random_uuid();
begin

  -- ── Organização ───────────────────────────────────────────
  insert into public.organizations
    (id, name, slug, phone, city, plan, subscription_status)
  values
    (v_org_id, 'Buffet Estrelinhas', 'estrelinhas', '(11) 99999-0001',
     'São Paulo', 'profissional', 'active')
  on conflict (id) do nothing;

  -- ── Profile e membership (usuário fictício já precisa existir
  --    em auth.users para FK; em dev use um usuário criado pelo
  --    Supabase Auth antes de rodar este seed, ou ajuste o UUID) ──
  insert into public.profiles (id, full_name, phone)
  values (v_user_id, 'Admin Dev', '(11) 91234-5678')
  on conflict (id) do nothing;

  insert into public.memberships (org_id, user_id, role)
  values (v_org_id, v_user_id, 'owner')
  on conflict (org_id, user_id) do nothing;

  -- ── Clientes ──────────────────────────────────────────────
  insert into public.customers
    (id, org_id, name, phone, email, child_name, child_birthdate)
  values
    (v_cust1, v_org_id, 'Ana Paula Souza',  '(11) 98000-1111',
     'ana@email.com',  'Lucas',  '2019-03-15'),
    (v_cust2, v_org_id, 'Carlos Mendes',    '(11) 98000-2222',
     'carlos@email.com','Sofia', '2020-07-22'),
    (v_cust3, v_org_id, 'Fernanda Lima',    '(11) 98000-3333',
     'fern@email.com', 'Pedro',  '2018-11-05');

  -- ── Pacotes ───────────────────────────────────────────────
  insert into public.packages
    (id, org_id, name, description, base_price_cents, max_guests, duration_hours)
  values
    (v_pkg1, v_org_id, 'Pacote Básico',
     'Salão decorado, buffet para 50 pessoas, 4h de festa',
     350000, 50, 4),
    (v_pkg2, v_org_id, 'Pacote Premium',
     'Salão decorado, buffet para 100 pessoas, DJ, 6h de festa',
     700000, 100, 6);

  -- ── Eventos ───────────────────────────────────────────────
  insert into public.events
    (id, org_id, customer_id, package_id, title, date,
     start_time, end_time, guests_count, status,
     total_cents, deposit_cents, deposit_paid)
  values
    (v_evt1, v_org_id, v_cust1, v_pkg1,
     'Festa do Lucas 6 anos', '2026-07-12',
     '14:00', '18:00', 45, 'confirmada',
     350000, 87500, true),

    (v_evt2, v_org_id, v_cust2, v_pkg2,
     'Festa da Sofia 6 anos', '2026-07-19',
     '15:00', '21:00', 90, 'orcamento',
     700000, 175000, false),

    (v_evt3, v_org_id, v_cust3, v_pkg1,
     'Festa do Pedro 8 anos', '2026-06-28',
     '13:00', '17:00', 48, 'realizada',
     350000, 87500, true),

    (v_evt4, v_org_id, v_cust1, null,
     'Aniversário avulso', '2026-08-02',
     '16:00', '20:00', 30, 'orcamento',
     200000, 0, false);

  -- ── Transações ────────────────────────────────────────────
  insert into public.transactions
    (org_id, event_id, type, description,
     amount_cents, due_date, paid_at, category, payment_method)
  values
    -- entrada confirmada evt1
    (v_org_id, v_evt1, 'receita', 'Sinal — Festa Lucas',
     87500,  '2026-06-01', '2026-06-01', 'sinal',    'pix'),

    -- saldo evt1 a receber
    (v_org_id, v_evt1, 'receita', 'Saldo — Festa Lucas',
     262500, '2026-07-12', null,        'evento',    null),

    -- receita evt3 quitada
    (v_org_id, v_evt3, 'receita', 'Pagamento total — Festa Pedro',
     350000, '2026-06-28', '2026-06-28', 'evento',   'pix'),

    -- despesa operacional
    (v_org_id, null, 'despesa', 'Aluguel do salão — junho',
     150000, '2026-06-05', '2026-06-05', 'aluguel',  'transferencia'),

    -- despesa fornecedor
    (v_org_id, null, 'despesa', 'Buffet fornecedor — junho',
     80000,  '2026-06-10', null,         'fornecedor', null),

    -- despesa manutenção
    (v_org_id, null, 'despesa', 'Manutenção equipamentos',
     25000,  '2026-06-15', null,         'manutencao', null);

end $$;
