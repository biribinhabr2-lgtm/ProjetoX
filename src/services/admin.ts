import { supabase } from '@/lib/supabase'
import type { Organization, AuditLog } from '@/types/database'

// ─── Organizações ─────────────────────────────────────────────

/** Lista todas as orgs (requer RLS is_platform_admin). */
export async function listAllOrgs(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Conta festas por org_id.
 * Retorna mapa orgId → count (requer RLS is_platform_admin em events).
 */
export async function getEventsCountByOrg(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('events')
    .select('org_id')
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const e of data ?? []) {
    counts[e.org_id] = (counts[e.org_id] ?? 0) + 1
  }
  return counts
}

// ─── Métricas ─────────────────────────────────────────────────

export interface AdminMetrics {
  totalOrgs:    number
  byPlan:       Record<string, number>
  newLast30d:   number
  eventsWeek:   number
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const cutoff30d  = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const cutoffWeek = new Date(Date.now() -  7 * 24 * 3600 * 1000).toISOString()

  const [orgsRes, eventsRes] = await Promise.all([
    supabase.from('organizations').select('plan, created_at'),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoffWeek),
  ])

  if (orgsRes.error) throw orgsRes.error

  const orgs = orgsRes.data ?? []
  const byPlan: Record<string, number> = {}
  let newLast30d = 0

  for (const o of orgs) {
    byPlan[o.plan] = (byPlan[o.plan] ?? 0) + 1
    if (o.created_at >= cutoff30d) newLast30d++
  }

  return {
    totalOrgs:  orgs.length,
    byPlan,
    newLast30d,
    eventsWeek: eventsRes.count ?? 0,
  }
}

// ─── Audit log ────────────────────────────────────────────────

export async function getAdminAuditLog(
  limit = 50,
  orgId?: string,
): Promise<AuditLog[]> {
  let q = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (orgId) q = q.eq('org_id', orgId)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

// ─── admin_set_org_plan ───────────────────────────────────────

/**
 * Altera plano de uma org via RPC auditada (SECURITY DEFINER no banco).
 * Requer is_platform_admin() — o banco rejeita caso contrário.
 */
export async function adminSetOrgPlan(
  orgId:    string,
  plan:     string,
  status:   string,
  trialEnd: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_org_plan', {
    p_org_id:    orgId,
    p_plan:      plan,
    p_status:    status,
    p_trial_end: trialEnd,
  })
  if (error) throw error
}
