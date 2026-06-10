import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'

export async function listCustomers(orgId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  if (error) throw error
  return data as Customer[]
}

export interface CreateCustomerPayload {
  org_id: string
  name: string
  phone?: string
  email?: string
  child_name?: string
  child_birthdate?: string
}

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as Customer
}
