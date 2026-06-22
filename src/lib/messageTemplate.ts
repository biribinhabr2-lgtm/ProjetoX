// Funções puras de renderização de templates de mensagem (escala e aniversário).
// Sem dependências de React, Supabase ou browser — testável com vitest puro.

export const DEFAULT_TEMPLATE =
  'Olá {nome}! Segue sua escala no {buffet}:\n' +
  '📍 Local: {local}\n' +
  '📅 Data: {data}\n' +
  '⏰ Horário: {horario_inicio} às {horario_fim}\n' +
  '⏱️ Duração: {duracao}\n' +
  '🎉 Festa: {festa}\n' +
  'Qualquer dúvida, fale com a gente. Até lá!'

export interface TemplateVariable {
  key:     string
  label:   string
  example: string
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'nome',           label: 'Nome do funcionário', example: 'Ana Silva'          },
  { key: 'buffet',         label: 'Nome do buffet',      example: 'Buffet Alegria'     },
  { key: 'local',          label: 'Endereço / local',    example: 'Rua das Flores 123' },
  { key: 'festa',          label: 'Título da festa',     example: 'Festa da Sofia'     },
  { key: 'data',           label: 'Data da festa',       example: '14/06/2026'         },
  { key: 'horario_inicio', label: 'Horário de início',   example: '14:00'              },
  { key: 'horario_fim',    label: 'Horário de término',  example: '18:00'              },
  { key: 'duracao',        label: 'Duração',             example: '4h'                 },
  { key: 'funcao',         label: 'Função na festa',     example: 'Recreador principal'},
  { key: 'observacoes',    label: 'Observações',         example: ''                   },
]

/**
 * Substitui os placeholders {chave} pelos valores em `data`.
 * Placeholders desconhecidos ou sem valor viram string vazia.
 */
export function renderTemplate(
  template: string,
  data: Record<string, string>,
): string {
  return template.replace(/\{([a-z_]+)\}/g, (_, key: string) => data[key] ?? '')
}

/**
 * Monta objeto de dados de exemplo para preview do template.
 */
export function buildExampleData(): Record<string, string> {
  return Object.fromEntries(
    TEMPLATE_VARIABLES.map((v) => [v.key, v.example]),
  )
}

/**
 * Calcula a duração entre dois horários HH:MM e retorna string legível.
 * Ex: "4h", "1h30min", "45min". Retorna '' se inválido.
 */
export function calcDuracao(
  start: string | null | undefined,
  end:   string | null | undefined,
): string {
  if (!start || !end) return ''
  const [sh = 0, sm = 0] = start.split(':').map(Number)
  const [eh = 0, em = 0] = end.split(':').map(Number)
  const totalMin = eh * 60 + em - (sh * 60 + sm)
  if (totalMin <= 0) return ''
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

/**
 * Formata data ISO "YYYY-MM-DD" para "dd/MM/yyyy" sem dependências externas.
 */
export function formatDateBR(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// ── Template de aniversário ───────────────────────────────────

export const DEFAULT_BIRTHDAY_TEMPLATE =
  'Olá {responsavel}! 🎂 O aniversário de {crianca} está chegando!\n' +
  '📅 Data: {data_aniversario}\n' +
  'Que tal garantir uma festa incrível? Entre em contato e venha conferir nossos pacotes!'

export interface BirthdayTemplateVariable {
  key:     string
  label:   string
  example: string
}

export const BIRTHDAY_TEMPLATE_VARIABLES: BirthdayTemplateVariable[] = [
  { key: 'crianca',          label: 'Nome da criança',      example: 'Sofia'       },
  { key: 'responsavel',      label: 'Nome do responsável',  example: 'Ana Lima'    },
  { key: 'data_aniversario', label: 'Data do aniversário',  example: '15/08'       },
]

/**
 * Monta objeto de dados de exemplo para preview do template de aniversário.
 */
export function buildBirthdayExampleData(): Record<string, string> {
  return Object.fromEntries(
    BIRTHDAY_TEMPLATE_VARIABLES.map((v) => [v.key, v.example]),
  )
}

/**
 * Gera link wa.me com a mensagem renderizada e encodeada.
 * Aceita o número sem código de país (será prefixado com 55).
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  const full   = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`
}

/**
 * Gera o texto de escala para UM funcionário com MÚLTIPLAS alocações no dia.
 * Usa o template para extrair saudação/rodapé e insere um bloco por festa.
 */
export function renderMultiAllocMessage(
  template: string,
  staffData: { nome: string; buffet: string; local: string },
  events: Array<{
    festa:          string
    data:           string
    horario_inicio: string
    horario_fim:    string
    duracao:        string
    funcao:         string
  }>,
): string {
  if (events.length === 1) {
    return renderTemplate(template, { ...staffData, ...events[0] })
  }

  // Para múltiplas festas, montar mensagem com um bloco por evento
  const lines: string[] = [
    `Olá ${staffData.nome}! Segue sua escala no ${staffData.buffet}:`,
    '',
  ]

  events.forEach((ev, i) => {
    lines.push(`🎉 Festa ${i + 1}: ${ev.festa}`)
    lines.push(`📍 ${staffData.local}`)
    lines.push(`📅 ${ev.data}`)
    if (ev.horario_inicio || ev.horario_fim) {
      lines.push(`⏰ ${ev.horario_inicio} às ${ev.horario_fim}`)
    }
    if (ev.duracao) lines.push(`⏱️ Duração: ${ev.duracao}`)
    if (ev.funcao)  lines.push(`👤 Função: ${ev.funcao}`)
    if (i < events.length - 1) lines.push('')
  })

  lines.push('')
  lines.push('Qualquer dúvida, fale com a gente. Até lá!')

  return lines.join('\n')
}
