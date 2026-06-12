// Tipos espelhando exatamente o schema do banco (0001_schema.sql)
// Dinheiro em centavos (integer). Datas ISO string.

export type OrgPlan =
  | 'trial'
  | 'essencial'
  | 'profissional'
  | 'rede'

export type MembershipRole = 'owner' | 'admin' | 'atendente'

export type EventStatus =
  | 'orcamento'
  | 'confirmada'
  | 'realizada'
  | 'cancelada'

export type QuoteStatus = 'enviado' | 'aceito' | 'recusado' | 'expirado'

export type TransactionType = 'receita' | 'despesa'

// ─────────────────────────────────────────────
// Tabelas
// ─────────────────────────────────────────────

export interface Organization {
  id: string
  created_at: string
  name: string
  slug: string
  phone: string | null
  city: string | null
  plan: OrgPlan
  trial_ends_at: string
  subscription_id: string | null
  subscription_status: string
  logo_url: string | null
  referred_by: string | null
}

export interface Profile {
  id: string
  created_at: string
  full_name: string | null
  phone: string | null
}

export interface Membership {
  id: string
  created_at: string
  org_id: string
  user_id: string
  role: MembershipRole
}

export interface Customer {
  id: string
  created_at: string
  org_id: string
  name: string
  phone: string | null
  email: string | null
  cpf: string | null
  notes: string | null
  child_name: string | null
  child_birthdate: string | null  // date → ISO string 'YYYY-MM-DD'
}

export interface Package {
  id: string
  created_at: string
  org_id: string
  name: string
  description: string | null
  base_price_cents: number
  max_guests: number | null
  duration_hours: number | null
}

export interface Event {
  id: string
  created_at: string
  org_id: string
  customer_id: string
  package_id: string | null
  title: string | null
  date: string               // date → ISO string 'YYYY-MM-DD'
  start_time: string | null  // time → 'HH:MM'
  end_time: string | null
  guests_count: number | null
  status: EventStatus
  total_cents: number
  deposit_cents: number
  deposit_paid: boolean
  notes: string | null
}

export interface Quote {
  id: string
  created_at: string
  org_id: string
  customer_id: string
  event_id: string | null
  public_token: string
  items: QuoteItem[]
  total_cents: number | null
  status: QuoteStatus
  valid_until: string | null  // date → 'YYYY-MM-DD'
  notes: string | null        // adicionado em 0003_public_quote_actions.sql
}

export interface QuoteItem {
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
}

export interface Transaction {
  id: string
  created_at: string
  org_id: string
  event_id: string | null
  type: TransactionType
  description: string | null
  amount_cents: number
  due_date: string | null    // date → 'YYYY-MM-DD'
  paid_at: string | null     // date → 'YYYY-MM-DD'
  category: string | null
  payment_method: string | null
}

export type CatalogUnit = 'un' | 'hora' | 'pessoa' | 'pacote'

export interface CatalogItem {
  id:          string
  created_at:  string
  org_id:      string
  name:        string
  description: string | null
  price_cents: number
  unit:        CatalogUnit
  category:    string | null
  active:      boolean
  sort_order:  number
}

export interface ApiKey {
  id:           string
  created_at:   string
  org_id:       string
  name:         string
  key_prefix:   string   // primeiros 8 chars do sufixo — para exibição
  key_hash:     string   // SHA-256 — nunca exibir
  last_used_at: string | null
  revoked_at:   string | null
}

export interface AuditLog {
  id: string
  created_at: string
  org_id: string
  user_id: string | null
  action: string
  entity: string
  entity_id: string | null
  payload: Record<string, unknown> | null
}

// ─────────────────────────────────────────────
// Tipo de retorno da RPC get_public_quote
// ─────────────────────────────────────────────
export interface PublicQuoteResponse {
  quote: Quote
  organization: Pick<Organization, 'name' | 'phone' | 'logo_url'>
  customer: Pick<Customer, 'name'>
}

// ─────────────────────────────────────────────
// Tipos com joins comuns (para uso nos services)
// ─────────────────────────────────────────────
export interface EventWithCustomer extends Event {
  customer: Pick<Customer, 'id' | 'name' | 'phone'>
}

export interface EventWithDetails extends Event {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'child_name'>
  package: Pick<Package, 'id' | 'name' | 'base_price_cents'> | null
}

export interface QuoteWithCustomer extends Quote {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email'>
}

/** Customer com estatísticas calculadas a partir de events */
export interface CustomerWithStats extends Customer {
  /** Soma de total_cents de events com status confirmada/realizada */
  total_spent_cents: number
  /** Quantidade de eventos confirmados/realizados */
  events_count: number
  /** Data ISO da festa mais recente (confirmada/realizada) */
  last_event_date: string | null
}
