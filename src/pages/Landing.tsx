/**
 * Landing page de conversão — regra 2: TODOS os componentes em nível de módulo.
 * Zero imagens externas. Mockups em HTML/CSS puro.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, FileText, DollarSign, Gift,
  CheckCircle2, ChevronDown, Phone, Mail,
  Zap, Crown, Network, MessageCircle,
  Shield, Smartphone, X, Star,
} from 'lucide-react'

// ─── Dados ───────────────────────────────────────────────────────────────────

const PAINS = [
  {
    emoji: '📅',
    title: 'Festa marcada em cima da outra',
    body: 'Dois eventos no mesmo horário. Você só descobre quando a família já confirmou convites — e a culpa é sua.',
  },
  {
    emoji: '💸',
    title: 'Sinal recebido, sinal esquecido',
    body: 'O dinheiro entrou, mas a festa ficou como "pendente". No grande dia você não sabe se o cliente pagou.',
  },
  {
    emoji: '📱',
    title: 'Orçamento sumido no WhatsApp',
    body: 'Você digita tudo na mão, manda pelo zap, o cliente "visualiza" e some. Sem rastreio, sem follow-up, sem festa.',
  },
]

const FEATURES = [
  {
    id: 'agenda',
    icon: Calendar,
    title: 'Agenda sem conflito',
    body: 'Calendário visual que detecta sobreposição em tempo real. Nunca mais dois buffets no mesmo horário.',
    color: '#3B82F6',
    lightColor: '#EFF6FF',
  },
  {
    id: 'orcamentos',
    icon: FileText,
    title: 'Orçamento com link de aceite',
    body: 'Gere um link profissional. O cliente abre no celular, vê tudo formatado e clica em "Aceitar" — sem WhatsApp.',
    color: '#F59E0B',
    lightColor: '#FFFBEB',
  },
  {
    id: 'financeiro',
    icon: DollarSign,
    title: 'Financeiro em tempo real',
    body: 'Receitas, despesas e saldo do mês. Gráfico de 6 meses. Sabe exatamente o que entrou e o que vai entrar.',
    color: '#16A34A',
    lightColor: '#F0FDF4',
  },
  {
    id: 'radar',
    icon: Gift,
    title: 'Radar de aniversários',
    body: 'Crianças que fazem aniversário nos próximos 45 dias. Um clique abre o WhatsApp com mensagem pronta.',
    color: '#E8462A',
    lightColor: '#FEF0EC',
  },
]

// TODO: substituir pelos depoimentos reais antes de ir ao ar
const TESTIMONIALS = [
  {
    name: 'Camila Rodrigues',
    role: 'Buffet Sonho Colorido — São Paulo, SP',
    text: 'Antes eu usava caderno, agenda de papel e WhatsApp. Perdi três sinais em um mês. Com o FestaHub nunca mais tive conflito de datas e o financeiro finalmente fecha.',
    initials: 'CR',
    color: '#E8462A',
  },
  {
    name: 'Marcelo Teixeira',
    role: 'Espaço Kids Alegria — Rio de Janeiro, RJ',
    text: 'O link de orçamento mudou tudo. Mando pro cliente, ele aceita na hora. A taxa de conversão subiu muito porque fica profissional e fácil de responder.',
    initials: 'MT',
    color: '#3B82F6',
  },
  {
    name: 'Fernanda Lima',
    role: 'Buffet Encanto — Belo Horizonte, MG',
    text: 'O radar de aniversários é genial. Entro em contato antes do cliente lembrar de ligar pra concorrência. Fechei quatro festas só essa semana.',
    initials: 'FL',
    color: '#16A34A',
  },
]

const FAQS = [
  {
    q: 'Preciso de cartão de crédito para testar?',
    a: 'Não. O trial de 14 dias é completamente gratuito, sem precisar cadastrar cartão. Você só escolhe um plano quando — e se — quiser continuar.',
  },
  {
    q: 'O sistema funciona no celular?',
    a: 'Sim. O FestaHub é totalmente responsivo e funciona bem em celular, tablet e computador. O link de aceite de orçamento enviado ao cliente também é otimizado para mobile.',
  },
  {
    q: 'Meus dados são meus — posso exportar?',
    a: 'Todos os dados são seus. Você pode exportar clientes, festas e financeiro a qualquer momento. Armazenamos tudo com criptografia em conformidade com a LGPD.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim, sem multa e sem burocracia. Cancele direto no painel em Configurações → Plano. O acesso fica ativo até o fim do período já pago.',
  },
  {
    q: 'Quantos usuários posso ter?',
    a: 'No Essencial: 1 usuário. No Profissional: até 5 (ideal para atendente + financeiro separados). No Rede: usuários ilimitados para múltiplas unidades.',
  },
]

const PLANS = [
  {
    id: 'essencial',
    label: 'Essencial',
    price: 97,
    description: 'Para quem está começando',
    Icon: Zap,
    features: ['Agenda de festas completa', 'Módulo de clientes', 'Financeiro completo', '1 usuário'],
    highlight: false,
  },
  {
    id: 'profissional',
    label: 'Profissional',
    price: 197,
    description: 'O mais escolhido ✦',
    Icon: Crown,
    features: ['Tudo do Essencial', 'Link de orçamento público', 'Até 5 usuários', 'Suporte prioritário', 'Relatórios avançados'],
    highlight: true,
  },
  {
    id: 'rede',
    label: 'Rede',
    price: 397,
    description: 'Para redes e franquias',
    Icon: Network,
    features: ['Tudo do Profissional', 'Múltiplas unidades', 'Usuários ilimitados', 'API de integração'],
    highlight: false,
  },
]

// ─── LogoMark ─────────────────────────────────────────────────────────────────

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#E8462A" />
      <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" opacity="0.95" />
      <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="14" cy="17.5" r="1" fill="white" opacity="0.8" />
    </svg>
  )
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ background: 'rgba(22,19,31,0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            FestaHub
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          <a href="#funcionalidades" className="text-sm text-white/60 transition-colors hover:text-white">Funcionalidades</a>
          <a href="#precos" className="text-sm text-white/60 transition-colors hover:text-white">Preços</a>
          <a href="#faq" className="text-sm text-white/60 transition-colors hover:text-white">FAQ</a>
          <Link to="/login" className="text-sm text-white/60 transition-colors hover:text-white">Entrar</Link>
          <Link
            to="/cadastro"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            Testar grátis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : (
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t px-5 pb-4 md:hidden" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex flex-col gap-3 pt-3">
            <a href="#funcionalidades" onClick={() => setOpen(false)} className="text-sm text-white/70">Funcionalidades</a>
            <a href="#precos" onClick={() => setOpen(false)} className="text-sm text-white/70">Preços</a>
            <a href="#faq" onClick={() => setOpen(false)} className="text-sm text-white/70">FAQ</a>
            <Link to="/login" onClick={() => setOpen(false)} className="text-sm text-white/70">Entrar</Link>
            <Link
              to="/cadastro"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              Testar grátis por 14 dias
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ─── CalendarMockup ───────────────────────────────────────────────────────────

const CAL_DAYS = [
  [0,  1,  2,  3,  4,  5,  6],
  [7,  8,  9, 10, 11, 12, 13],
  [14, 15, 16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25, 26, 27],
  [28, 29, 30,  0,  0,  0,  0],
]

const CAL_EVENTS: Record<number, { label: string; color: string; bg: string }> = {
  7:  { label: 'Sofia 5 anos',   color: '#1D4ED8', bg: '#DBEAFE' },
  14: { label: 'Pedro e Ana',    color: '#92400E', bg: '#FEF3C7' },
  21: { label: 'Isabella 3a',    color: '#1D4ED8', bg: '#DBEAFE' },
  28: { label: 'Mateus 6a',      color: '#166534', bg: '#DCFCE7' },
}

function CalendarMockup() {
  return (
    <div
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
      style={{ background: '#fff' }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: '#F1F0EF', borderBottom: '1px solid #E5E4E2' }}
      >
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <div
          className="ml-2 flex-1 rounded-md px-3 py-1 text-center text-xs text-gray-400"
          style={{ background: '#E5E4E2', fontFamily: 'monospace' }}
        >
          app.festahub.com.br/agenda
        </div>
      </div>

      {/* App header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #F0EDE8' }}
      >
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-sm font-bold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
            FestaHub
          </span>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
          style={{ background: '#FEF0EC', color: '#E8462A' }}
        >
          Trial · 14d
        </span>
      </div>

      {/* Calendar header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
          Junho 2026
        </p>
        <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-2 pb-1">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <div key={i} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="px-2 pb-3">
        {CAL_DAYS.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              const evt = day ? CAL_EVENTS[day] : null
              const isToday = day === 11
              return (
                <div
                  key={di}
                  className="relative flex min-h-[34px] flex-col items-center pt-1"
                >
                  {day > 0 && (
                    <>
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium"
                        style={isToday
                          ? { background: '#E8462A', color: '#fff', fontWeight: 700 }
                          : { color: '#374151' }
                        }
                      >
                        {day}
                      </span>
                      {evt && (
                        <div
                          className="mt-0.5 w-full truncate rounded px-1 text-[8px] font-semibold"
                          style={{ background: evt.bg, color: evt.color }}
                        >
                          {evt.label}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Bottom event strip */}
      <div
        className="flex items-center gap-2 border-t px-4 py-2.5"
        style={{ borderColor: '#F0EDE8', background: '#FAFAF9' }}
      >
        <div
          className="h-2 w-2 rounded-full"
          style={{ background: '#E8462A' }}
        />
        <span className="text-[11px] text-gray-500">
          <strong className="text-gray-700">11 Jun</strong> · Hoje — 2 festas confirmadas
        </span>
      </div>
    </div>
  )
}

// ─── HeroSection ─────────────────────────────────────────────────────────────

function ConfettiDots() {
  const dots = [
    { x: '8%',  y: '15%', size: 6,  color: '#E8462A', rotate: 45 },
    { x: '15%', y: '70%', size: 8,  color: '#F59E0B', rotate: 20 },
    { x: '5%',  y: '45%', size: 4,  color: '#3B82F6', rotate: 60 },
    { x: '25%', y: '85%', size: 5,  color: '#E8462A', rotate: 10 },
    { x: '88%', y: '12%', size: 7,  color: '#F59E0B', rotate: 35 },
    { x: '92%', y: '55%', size: 5,  color: '#16A34A', rotate: 50 },
    { x: '80%', y: '80%', size: 6,  color: '#3B82F6', rotate: 15 },
    { x: '70%', y: '8%',  size: 4,  color: '#E8462A', rotate: 70 },
    { x: '50%', y: '92%', size: 7,  color: '#F59E0B', rotate: 25 },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute opacity-20"
          style={{
            left: d.x, top: d.y,
            width: d.size, height: d.size,
            background: d.color,
            borderRadius: '2px',
            transform: `rotate(${d.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}

function HeroSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#16131F' }}
    >
      <ConfettiDots />

      {/* Coral glow */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #E8462A 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: copy */}
          <div className="animate-fade-up">
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
              style={{ borderColor: 'rgba(232,70,42,0.3)', background: 'rgba(232,70,42,0.08)' }}
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: '#E8462A' }}
              />
              <span className="text-xs font-semibold" style={{ color: '#E8462A' }}>
                14 dias grátis · Sem cartão de crédito
              </span>
            </div>

            <h1
              className="mb-5 text-4xl font-extrabold leading-[1.1] text-white md:text-5xl lg:text-6xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Chega de agenda no caderno e{' '}
              <span style={{ color: '#E8462A' }}>orçamento perdido no WhatsApp</span>
            </h1>

            <p className="mb-8 text-lg leading-relaxed text-white/60">
              FestaHub é o sistema completo para buffets infantis e brinquedotecas.
              Agenda, orçamentos com link de aceite, financeiro e radar de aniversários —
              tudo num só lugar.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/cadastro"
                className="group inline-flex items-center gap-2 rounded-xl px-7 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg, #E8462A, #C93920)', boxShadow: '0 8px 24px rgba(232,70,42,0.35)' }}
              >
                Testar grátis por 14 dias — sem cartão
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16" className="transition-transform group-hover:translate-x-1">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border px-7 py-4 text-base font-semibold text-white/70 transition-colors hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.12)' }}
              >
                Já tenho conta
              </Link>
            </div>

            {/* Social proof micro */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {['#E8462A','#3B82F6','#16A34A','#F59E0B'].map((c, i) => (
                  <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold text-white" style={{ background: c, borderColor: '#16131F' }}>
                    {['C','M','F','R'][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/50">
                <span className="font-semibold text-white/80">+200 buffets</span> já usam o FestaHub
              </p>
            </div>
          </div>

          {/* Right: mockup */}
          <div
            className="animate-scale-in"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="relative">
              {/* Glow behind mockup */}
              <div
                className="absolute inset-0 rounded-3xl opacity-30 blur-3xl"
                style={{ background: 'linear-gradient(135deg, #E8462A, #3B82F6)' }}
                aria-hidden="true"
              />
              <div className="relative animate-float">
                <CalendarMockup />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── PainSection ─────────────────────────────────────────────────────────────

interface PainCardProps {
  emoji: string
  title: string
  body: string
}

function PainCard({ emoji, title, body }: PainCardProps) {
  return (
    <div
      className="rounded-2xl border p-6 transition-shadow hover:shadow-lg"
      style={{ background: '#fff', borderColor: '#EDE9E3' }}
    >
      <div className="mb-4 text-4xl" role="img" aria-label={title}>{emoji}</div>
      <h3 className="mb-2 text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
      <p className="text-base leading-relaxed text-gray-500">{body}</p>
    </div>
  )
}

function PainSection() {
  return (
    <section style={{ background: 'var(--color-background)' }} className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 text-center">
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-primary)' }}
          >
            Você reconhece essa situação?
          </p>
          <h2
            className="text-3xl font-extrabold text-gray-900 md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            A gestão manual custa caro
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
            Caderno, planilha, WhatsApp e memória não escalam. E cada erro custa um cliente.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PAINS.map((p) => (
            <PainCard key={p.title} {...p} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Mockups de Funcionalidades ───────────────────────────────────────────────

function AgendaMockupSmall() {
  return (
    <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: '#EDE9E3' }}>
      <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: '#F0EDE8' }}>
        <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>Junho 2026</span>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        {[
          { day: 'Sex 7', label: 'Sofia 5 anos', color: '#1D4ED8', bg: '#DBEAFE' },
          { day: 'Sáb 14', label: 'Pedro e Ana', color: '#92400E', bg: '#FEF3C7' },
          { day: 'Dom 21', label: 'Isabella 3a', color: '#1D4ED8', bg: '#DBEAFE' },
        ].map((e) => (
          <div key={e.day} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: e.bg }}>
            <span className="text-[10px] font-semibold text-gray-500 w-10 shrink-0">{e.day}</span>
            <span className="text-[11px] font-semibold truncate" style={{ color: e.color }}>{e.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5">
          <svg width="10" height="10" fill="none" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" stroke="#DC2626" strokeWidth="1.2"/><path d="M5 3v2.5M5 7h.01" stroke="#DC2626" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span className="text-[10px] font-semibold text-red-700">Conflito detectado — Sáb 28</span>
        </div>
      </div>
    </div>
  )
}

function OrcamentoMockupSmall() {
  return (
    <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: '#EDE9E3' }}>
      <div className="border-b px-4 py-2.5 flex items-center justify-between" style={{ borderColor: '#F0EDE8' }}>
        <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>Orçamento #042</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700">Enviado</span>
      </div>
      <div className="p-3 space-y-1.5">
        {[
          { item: 'Pacote Básico 4h', valor: 'R$ 1.800' },
          { item: 'Decoração temática', valor: 'R$ 600' },
          { item: 'Buffet completo', valor: 'R$ 400' },
        ].map((r) => (
          <div key={r.item} className="flex items-center justify-between text-[11px]">
            <span className="text-gray-600">{r.item}</span>
            <span className="font-semibold text-gray-800">{r.valor}</span>
          </div>
        ))}
        <div className="border-t pt-1.5 flex justify-between" style={{ borderColor: '#F0EDE8' }}>
          <span className="text-[11px] font-bold text-gray-800">Total</span>
          <span className="text-[13px] font-extrabold" style={{ color: '#16A34A', fontFamily: 'var(--font-display)' }}>R$ 2.800</span>
        </div>
        <div className="flex gap-1.5 pt-0.5">
          <div className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-bold text-white" style={{ background: '#16A34A' }}>✓ Aceitar</div>
          <div className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-bold bg-gray-100 text-gray-500">Recusar</div>
        </div>
        <div className="rounded-lg bg-blue-50 px-2 py-1 text-center text-[10px] text-blue-700 font-medium">
          🔗 Link copiado! Enviado via WhatsApp
        </div>
      </div>
    </div>
  )
}

function FinanceiroMockupSmall() {
  const bars = [40, 65, 48, 72, 55, 88]
  return (
    <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: '#EDE9E3' }}>
      <div className="border-b px-4 py-2.5" style={{ borderColor: '#F0EDE8' }}>
        <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>Junho 2026</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Receitas', val: 'R$ 12.480', color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Despesas', val: 'R$ 3.200', color: '#DC2626', bg: '#FEF2F2' },
            { label: 'Saldo', val: 'R$ 9.280', color: '#16A34A', bg: '#F0FDF4' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg p-2" style={{ background: s.bg }}>
              <p className="text-[9px] text-gray-500">{s.label}</p>
              <p className="text-[10px] font-extrabold leading-tight" style={{ color: s.color, fontFamily: 'var(--font-display)' }}>{s.val}</p>
            </div>
          ))}
        </div>
        {/* Bar chart */}
        <div className="flex items-end gap-1 h-10 pt-1">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 5 ? '#E8462A' : '#E8462A33' }} />
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-2 py-1.5">
          <span className="text-[10px] font-semibold text-green-700">↑ Festa da Sofia</span>
          <span className="ml-auto text-[11px] font-bold text-green-700" style={{ fontFamily: 'var(--font-display)' }}>+R$ 2.800</span>
        </div>
      </div>
    </div>
  )
}

function RadarMockupSmall() {
  return (
    <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: '#EDE9E3' }}>
      <div className="border-b px-4 py-2.5" style={{ borderColor: '#F0EDE8' }}>
        <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>Radar de Aniversários</span>
        <span className="ml-2 text-[10px] text-gray-400">próximos 45 dias</span>
      </div>
      <div className="p-3 space-y-1.5">
        {[
          { nome: 'Sophie', data: '18 Jun', dias: 7,  urgencia: '#DC2626', bg: '#FEF2F2' },
          { nome: 'Gael',   data: '25 Jun', dias: 14, urgencia: '#F59E0B', bg: '#FFFBEB' },
          { nome: 'Laura',  data: '10 Jul', dias: 29, urgencia: '#3B82F6', bg: '#EFF6FF' },
        ].map((b) => (
          <div key={b.nome} className="flex items-center gap-2 rounded-lg p-2" style={{ background: b.bg }}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: b.urgencia }}>
              {b.nome[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-gray-800">{b.nome} · {b.data}</p>
            </div>
            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: b.urgencia }}>
              {b.dias}d
            </span>
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white" style={{ background: '#25D366' }}>
              <MessageCircle className="h-3 w-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── FeaturesSection ─────────────────────────────────────────────────────────

interface FeaturePanelProps {
  icon: React.ElementType
  title: string
  body: string
  color: string
  lightColor: string
  mockup: React.ReactNode
  reverse?: boolean
}

function FeaturePanel({ icon: Icon, title, body, color, lightColor, mockup, reverse }: FeaturePanelProps) {
  return (
    <div className={`flex flex-col gap-10 md:items-center ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
      <div className="flex-1 space-y-4">
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: lightColor }}
        >
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
        <h3
          className="text-2xl font-extrabold text-white md:text-3xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h3>
        <p className="text-lg leading-relaxed text-white/60">{body}</p>
        <Link
          to="/cadastro"
          className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color }}
        >
          Testar grátis →
        </Link>
      </div>
      <div className="flex-1 max-w-xs mx-auto md:mx-0 md:max-w-sm w-full">
        {mockup}
      </div>
    </div>
  )
}

function FeaturesSection() {
  const panels = [
    { ...FEATURES[0], mockup: <AgendaMockupSmall /> },
    { ...FEATURES[1], mockup: <OrcamentoMockupSmall />, reverse: true },
    { ...FEATURES[2], mockup: <FinanceiroMockupSmall /> },
    { ...FEATURES[3], mockup: <RadarMockupSmall />, reverse: true },
  ]

  return (
    <section id="funcionalidades" style={{ background: '#16131F' }} className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-16 text-center">
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest"
            style={{ color: '#E8462A' }}
          >
            Funcionalidades
          </p>
          <h2
            className="text-3xl font-extrabold text-white md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Tudo que seu buffet precisa
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/50">
            Pensado para a realidade do buffet infantil brasileiro. Simples de usar, poderoso de verdade.
          </p>
        </div>

        <div className="space-y-24">
          {panels.map((p) => (
            <FeaturePanel
              key={p.id}
              icon={p.icon}
              title={p.title}
              body={p.body}
              color={p.color}
              lightColor={p.lightColor}
              mockup={p.mockup}
              reverse={('reverse' in p) ? p.reverse : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── TestimonialsSection ──────────────────────────────────────────────────────

interface TestimonialCardProps {
  name: string
  role: string
  text: string
  initials: string
  color: string
}

function TestimonialCard({ name, role, text, initials, color }: TestimonialCardProps) {
  return (
    <div
      className="flex flex-col gap-5 rounded-2xl border p-6 transition-shadow hover:shadow-lg"
      style={{ background: '#fff', borderColor: '#EDE9E3' }}
    >
      <div className="flex text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <p className="flex-1 text-base leading-relaxed text-gray-600">"{text}"</p>
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: color }}
        >
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">{role}</p>
        </div>
      </div>
    </div>
  )
}

function TestimonialsSection() {
  return (
    <section style={{ background: 'var(--color-background)' }} className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 text-center">
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-primary)' }}
          >
            Depoimentos
          </p>
          <h2
            className="text-3xl font-extrabold text-gray-900 md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quem usa, recomenda
          </h2>
          {/* TODO: substituir pelos depoimentos reais antes de publicar */}
          <p className="mt-2 text-xs text-gray-400">(depoimentos ilustrativos — substituir por reais)</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── PricingSection ───────────────────────────────────────────────────────────

interface PlanCardProps {
  id: string
  label: string
  price: number
  description: string
  Icon: React.ElementType
  features: string[]
  highlight: boolean
}

function PlanCard({ label, price, description, Icon, features, highlight }: PlanCardProps) {
  return (
    <div
      className="relative flex flex-col rounded-2xl p-7 transition-transform hover:-translate-y-1"
      style={highlight
        ? {
            background: 'linear-gradient(145deg, #1E1A2B, #252033)',
            border: '2px solid #E8462A',
            boxShadow: '0 0 40px rgba(232,70,42,0.2)',
          }
        : {
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }
      }
    >
      {highlight && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white whitespace-nowrap"
          style={{ background: 'var(--color-primary)' }}
        >
          Mais popular
        </div>
      )}

      <div className="mb-6">
        <div
          className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: highlight ? 'rgba(232,70,42,0.15)' : 'rgba(255,255,255,0.06)' }}
        >
          <Icon className="h-5 w-5" style={{ color: highlight ? '#E8462A' : '#fff' }} />
        </div>
        <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{label}</h3>
        <p className="mt-0.5 text-sm" style={{ color: highlight ? '#E8462A' : 'rgba(255,255,255,0.4)' }}>{description}</p>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-sm text-white/40">R$</span>
          <span
            className="text-5xl font-extrabold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {price}
          </span>
          <span className="text-sm text-white/40">/mês</span>
        </div>
      </div>

      <ul className="mb-7 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: highlight ? '#E8462A' : '#16A34A' }}
            />
            {f}
          </li>
        ))}
      </ul>

      <Link
        to="/cadastro"
        className="block rounded-xl px-6 py-3.5 text-center text-sm font-bold transition-all hover:opacity-90"
        style={highlight
          ? { background: 'var(--color-primary)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }
        }
      >
        Começar grátis por 14 dias
      </Link>
    </div>
  )
}

function PricingSection() {
  return (
    <section
      id="precos"
      style={{ background: '#16131F' }}
      className="py-20"
    >
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 text-center">
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest"
            style={{ color: '#E8462A' }}
          >
            Preços
          </p>
          <h2
            className="text-3xl font-extrabold text-white md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Planos sem surpresa
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/50">
            Comece grátis por 14 dias. Cancele quando quiser, sem burocracia.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <PlanCard key={p.id} {...p} />
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-white/30">
          Todos os planos incluem trial de 14 dias grátis · Sem cartão de crédito · Cancele quando quiser
        </p>
      </div>
    </section>
  )
}

// ─── FaqSection ───────────────────────────────────────────────────────────────

interface FaqItemProps {
  q: string
  a: string
}

function FaqItem({ q, a }: FaqItemProps) {
  return (
    <details className="group border-b" style={{ borderColor: '#EDE9E3' }}>
      <summary
        className="flex cursor-pointer items-center justify-between gap-4 py-5 text-base font-semibold text-gray-900 marker:content-none hover:text-gray-700"
        style={{ fontFamily: 'var(--font-display)', listStyle: 'none' }}
      >
        {q}
        <ChevronDown
          className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <p className="pb-5 text-base leading-relaxed text-gray-500">{a}</p>
    </details>
  )
}

function FaqSection() {
  return (
    <section id="faq" style={{ background: 'var(--color-background)' }} className="py-20">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-12 text-center">
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-primary)' }}
          >
            Dúvidas frequentes
          </p>
          <h2
            className="text-3xl font-extrabold text-gray-900 md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Perguntas frequentes
          </h2>
        </div>
        <div className="rounded-2xl border bg-white p-2" style={{ borderColor: '#EDE9E3' }}>
          {FAQS.map((f) => (
            <FaqItem key={f.q} {...f} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CtaBanner ────────────────────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section
      className="relative overflow-hidden py-20"
      style={{ background: 'var(--color-primary)' }}
    >
      {/* Pattern */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: `${40 + (i * 23) % 80}px`,
              height: `${40 + (i * 23) % 80}px`,
              background: '#fff',
              left: `${(i * 137) % 100}%`,
              top: `${(i * 79) % 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <h2
          className="mb-4 text-3xl font-extrabold text-white md:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Pronto para organizar seu buffet de vez?
        </h2>
        <p className="mb-8 text-lg text-white/80">
          14 dias grátis. Sem cartão. Sem compromisso. Cancele quando quiser.
        </p>
        <Link
          to="/cadastro"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold transition-all hover:scale-105"
          style={{ color: 'var(--color-primary)' }}
        >
          Começar agora — é grátis
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      className="border-t"
      style={{ background: '#16131F', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <LogoMark size={32} />
              <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                FestaHub
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/40">
              Sistema de gestão para buffets infantis e brinquedotecas.
              Agenda, orçamentos, financeiro e radar de aniversários.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4" style={{ color: '#25D366' }} />
                WhatsApp
              </a>
              <a
                href="mailto:contato@festahub.com.br"
                className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 text-white/40" />
                E-mail
              </a>
            </div>
          </div>

          {/* Links produto */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Produto</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Funcionalidades', to: '#funcionalidades' },
                { label: 'Preços', to: '#precos' },
                { label: 'FAQ', to: '#faq' },
                { label: 'Entrar', to: '/login' },
                { label: 'Criar conta', to: '/cadastro' },
              ].map((l) => (
                <li key={l.label}>
                  {l.to.startsWith('#') ? (
                    <a href={l.to} className="text-sm text-white/50 transition-colors hover:text-white">{l.label}</a>
                  ) : (
                    <Link to={l.to} className="text-sm text-white/50 transition-colors hover:text-white">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Links legais */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link to="/termos" className="text-sm text-white/50 transition-colors hover:text-white">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="text-sm text-white/50 transition-colors hover:text-white">Política de Privacidade</Link></li>
            </ul>
            <div className="mt-6 flex items-center gap-2">
              <Shield className="h-4 w-4 text-white/30" />
              <span className="text-xs text-white/30">Conforme LGPD</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-white/30" />
              <span className="text-xs text-white/30">100% responsivo</span>
            </div>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-white/25 md:flex-row"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <span>© 2026 FestaHub. Todos os direitos reservados.</span>
          <span>Feito com ❤️ para os buffets do Brasil</span>
        </div>
      </div>
    </footer>
  )
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <PainSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <CtaBanner />
        <FaqSection />
      </main>
      <Footer />
    </>
  )
}
