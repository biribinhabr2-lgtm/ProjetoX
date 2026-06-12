import { describe, it, expect } from 'vitest'
import {
  renderTemplate,
  calcDuracao,
  buildWhatsAppLink,
  formatDateBR,
  renderMultiAllocMessage,
  DEFAULT_TEMPLATE,
} from './messageTemplate'

describe('renderTemplate', () => {
  it('substitui todos os placeholders do template padrão', () => {
    const data = {
      nome:           'Ana Silva',
      buffet:         'Buffet Alegria',
      local:          'Rua das Flores 123',
      data:           '14/06/2026',
      horario_inicio: '14:00',
      horario_fim:    '18:00',
      duracao:        '4h',
      festa:          'Festa da Sofia',
    }
    const result = renderTemplate(DEFAULT_TEMPLATE, data)
    expect(result).toContain('Ana Silva')
    expect(result).toContain('Buffet Alegria')
    expect(result).toContain('Rua das Flores 123')
    expect(result).toContain('14/06/2026')
    expect(result).toContain('14:00')
    expect(result).toContain('4h')
    expect(result).not.toContain('{nome}')
    expect(result).not.toContain('{buffet}')
  })

  it('placeholder desconhecido vira string vazia (nunca exibe {x} cru)', () => {
    const result = renderTemplate('Olá {nome}, seu {desconhecido} está pronto!', { nome: 'João' })
    expect(result).toBe('Olá João, seu  está pronto!')
    expect(result).not.toContain('{desconhecido}')
  })

  it('campo com valor vazio vira string vazia sem exibir o placeholder', () => {
    const result = renderTemplate('Função: {funcao}', { funcao: '' })
    expect(result).toBe('Função: ')
    expect(result).not.toContain('{funcao}')
  })

  it('preserva emojis no template', () => {
    const result = renderTemplate('🎉 Festa: {festa}', { festa: 'Carnaval 🎭' })
    expect(result).toBe('🎉 Festa: Carnaval 🎭')
  })

  it('preserva quebras de linha', () => {
    const result = renderTemplate('linha1\nlinha2\n{campo}', { campo: 'valor' })
    expect(result).toContain('\n')
    expect(result).toBe('linha1\nlinha2\nvalor')
  })
})

describe('calcDuracao', () => {
  it('retorna "4h" para 14:00–18:00', () => {
    expect(calcDuracao('14:00', '18:00')).toBe('4h')
  })

  it('retorna "1h30min" para 08:00–09:30', () => {
    expect(calcDuracao('08:00', '09:30')).toBe('1h30min')
  })

  it('retorna "45min" para 10:00–10:45', () => {
    expect(calcDuracao('10:00', '10:45')).toBe('45min')
  })

  it('retorna "" para horários inválidos (fim antes do início)', () => {
    expect(calcDuracao('18:00', '14:00')).toBe('')
  })

  it('retorna "" para null', () => {
    expect(calcDuracao(null, null)).toBe('')
    expect(calcDuracao('10:00', null)).toBe('')
  })
})

describe('formatDateBR', () => {
  it('formata "2026-06-14" como "14/06/2026"', () => {
    expect(formatDateBR('2026-06-14')).toBe('14/06/2026')
  })

  it('retorna o valor original se não for ISO', () => {
    expect(formatDateBR('data inválida')).toBe('data inválida')
  })
})

describe('buildWhatsAppLink', () => {
  it('prefixa 55 automaticamente', () => {
    const link = buildWhatsAppLink('11999990000', 'Olá!')
    expect(link).toContain('wa.me/5511999990000')
  })

  it('não duplica 55 se já estiver presente', () => {
    const link = buildWhatsAppLink('5511999990000', 'Olá!')
    expect(link).toContain('wa.me/5511999990000')
    expect(link).not.toContain('wa.me/555511')
  })

  it('codifica acentos corretamente (encodeURIComponent)', () => {
    const link = buildWhatsAppLink('11999990000', 'Festa da João')
    expect(link).toContain(encodeURIComponent('Festa da João'))
  })

  it('preserva quebras de linha como %0A', () => {
    const msg  = 'linha1\nlinha2'
    const link = buildWhatsAppLink('11999990000', msg)
    expect(link).toContain('%0A')
  })

  it('preserva emojis encodados na URL', () => {
    const msg  = '🎉 Festa'
    const link = buildWhatsAppLink('11999990000', msg)
    expect(link).toContain(encodeURIComponent('🎉 Festa'))
  })
})

describe('renderMultiAllocMessage', () => {
  const staffData = { nome: 'Maria', buffet: 'Buffet Luz', local: 'Rua A, 1' }

  it('usa renderTemplate normal para 1 evento', () => {
    const ev = {
      festa: 'Festa 1', data: '01/01/2026',
      horario_inicio: '10:00', horario_fim: '14:00', duracao: '4h', funcao: '',
    }
    const result = renderMultiAllocMessage(DEFAULT_TEMPLATE, staffData, [ev])
    expect(result).toContain('Maria')
    expect(result).toContain('Festa 1')
  })

  it('gera seção por festa para N > 1 eventos', () => {
    const events = [
      { festa: 'Festa 1', data: '01/01/2026', horario_inicio: '10:00', horario_fim: '14:00', duracao: '4h', funcao: '' },
      { festa: 'Festa 2', data: '01/01/2026', horario_inicio: '15:00', horario_fim: '18:00', duracao: '3h', funcao: '' },
    ]
    const result = renderMultiAllocMessage(DEFAULT_TEMPLATE, staffData, events)
    expect(result).toContain('Festa 1: Festa 1')
    expect(result).toContain('Festa 2: Festa 2')
    expect(result).toContain('Maria')
  })
})
