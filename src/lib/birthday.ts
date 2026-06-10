/**
 * Utilitários de data de aniversário.
 * Usa date-fns; fuso America/Sao_Paulo quando necessário.
 */

import { differenceInDays } from 'date-fns'

/**
 * Dias até o próximo aniversário (compara apenas mês/dia, o ano é recorrente).
 * Retorna 0 se hoje é o aniversário.
 */
export function daysUntilBirthday(birthdate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [, mm, dd] = birthdate.split('-').map(Number)

  // Tenta neste ano
  let next = new Date(today.getFullYear(), mm - 1, dd)
  next.setHours(0, 0, 0, 0)

  // Se já passou, mover para o próximo ano
  if (next < today) {
    next = new Date(today.getFullYear() + 1, mm - 1, dd)
    next.setHours(0, 0, 0, 0)
  }

  return differenceInDays(next, today)
}

/**
 * Idade que a criança fará no próximo aniversário.
 */
export function ageAtNextBirthday(birthdate: string): number {
  const today = new Date()
  const [yyyy, mm, dd] = birthdate.split('-').map(Number)

  const thisYearBirthday = new Date(today.getFullYear(), mm - 1, dd)

  if (thisYearBirthday < today) {
    // já fez aniversário esse ano → vai completar no próximo
    return today.getFullYear() - yyyy + 1
  }
  return today.getFullYear() - yyyy
}

/**
 * Indica se o aniversário cai dentro dos próximos `windowDays` dias.
 */
export function isBirthdaySoon(birthdate: string, windowDays = 45): boolean {
  const days = daysUntilBirthday(birthdate)
  return days <= windowDays
}

// ── Máscara de telefone brasileiro ────────────────────────────
/**
 * Aplica máscara de telefone brasileiro ao digitar.
 * Suporta celular (11 dígitos): (11) 99999-9999
 * e fixo (10 dígitos): (11) 9999-9999
 */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 2)  return digits.replace(/^(\d{0,2})/, '($1')
  if (digits.length <= 6)  return digits.replace(/^(\d{2})(\d{0,4})/, '($1) $2')
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  // 11 dígitos (celular)
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

/**
 * Remove máscara e retorna somente dígitos.
 */
export function unmaskedPhone(masked: string): string {
  return masked.replace(/\D/g, '')
}

/**
 * Gera link do WhatsApp com DDI 55 (Brasil).
 */
export function whatsappLink(phone: string): string {
  const digits = unmaskedPhone(phone)
  const withDDI = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withDDI}`
}
