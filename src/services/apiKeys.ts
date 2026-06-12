// Regra 4: toda comunicação com o backend passa por este módulo.
import { supabase } from '@/lib/supabase'

export interface ApiKey {
  id:           string
  org_id:       string
  name:         string
  key_prefix:   string
  last_used_at: string | null
  revoked_at:   string | null
  created_at:   string
}

/** Lista todas as API Keys da org do usuário logado (via RLS). */
export async function listApiKeys(): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, org_id, name, key_prefix, last_used_at, revoked_at, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ApiKey[]
}

interface CreateApiKeyResult {
  /** Chave completa — exibida UMA única vez, nunca recuperável depois. */
  key:        string
  key_prefix: string
  name:       string
}

/**
 * Cria uma nova API Key para a org do usuário logado.
 * A chave completa é retornada UMA ÚNICA VEZ pela Edge Function.
 * O servidor persiste apenas o hash SHA-256 — nunca o texto puro.
 */
export async function createApiKey(name: string): Promise<CreateApiKeyResult> {
  const { data, error } = await supabase.functions.invoke<CreateApiKeyResult>(
    'create-api-key',
    { body: { name } },
  )
  if (error) {
    const msg = (error as { message?: string }).message ?? 'Erro ao criar chave'
    throw new Error(msg)
  }
  if (!data?.key) throw new Error('Resposta inválida da função')
  return data
}

/** Revoga uma API Key (seta revoked_at = agora). */
export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
