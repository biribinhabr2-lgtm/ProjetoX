/** Retorna true quando a requisição não chegou a receber resposta do servidor */
export function isNetworkError(error: unknown): boolean {
  if (!navigator.onLine) return true
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('network request failed') ||
      msg.includes('load failed') ||
      msg.includes('the internet connection appears to be offline')
    ) {
      return true
    }
  }
  // Supabase pode envelopar o TypeError com uma AuthRetryableFetchError
  if (error && typeof error === 'object') {
    const cause = (error as Record<string, unknown>)['cause']
    if (cause instanceof TypeError) return isNetworkError(cause)
    const name = (error as Record<string, unknown>)['name']
    if (name === 'AuthRetryableFetchError') return true
  }
  return false
}

/** Retorna true quando o servidor respondeu explicitamente que a sessão é inválida */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const status = (error as Record<string, unknown>)['status'] as number | undefined
    if (status === 401 || status === 403) return true
    const code = (error as Record<string, unknown>)['code'] as string | undefined
    if (code === 'session_not_found' || code === 'invalid_grant') return true
  }
  if (error instanceof Error) {
    const msg = error.message
    if (
      msg.includes('JWT') ||
      msg.includes('session_not_found') ||
      msg.includes('not authenticated') ||
      msg.includes('Invalid Refresh Token') ||
      msg.includes('Refresh Token Not Found')
    ) {
      return true
    }
  }
  return false
}
