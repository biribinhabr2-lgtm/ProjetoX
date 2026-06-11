/**
 * OrcamentoPublico — página pública de orçamento acessível sem login.
 *
 * REGRA CRÍTICA: este arquivo NÃO pode importar nada do authStore
 * nem de qualquer módulo de autenticação. Acesso via token UUID público.
 *
 * Regra 2: sub-componentes definidos em nível de módulo.
 * Regra 7: dinheiro em centavos no banco; exibição BRL na UI.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, parseISO, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, XCircle, Loader2, MessageCircle, CalendarX2,
  ShieldCheck, Clock, PartyPopper,
} from 'lucide-react'
import { getPublicQuote, updatePublicQuoteStatus } from '@/services/quotes'
import type { PublicStatusContext } from '@/services/quotes'
import { whatsappLink } from '@/lib/birthday'
import type { PublicQuoteResponse } from '@/types/database'

const fmtBRL = (cents: number | null) =>
  cents != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
    : '—'

// ── LogoMark SVG inline ───────────────────────────────────────
function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="20" fill="#E8462A" />
      <path d="M12 28 Q20 10 28 28" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="13" r="3" fill="white" />
    </svg>
  )
}

// ── StatusBanner — resultado da ação do cliente ───────────────
interface StatusBannerProps {
  status: 'aceito' | 'recusado' | 'expirado' | null
  orgName: string
  orgPhone: string | null
}

function StatusBanner({ status, orgName, orgPhone }: StatusBannerProps) {
  if (status === 'aceito') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <PartyPopper className="h-12 w-12 text-green-600" />
        <div>
          <h2 className="text-xl font-bold text-green-800">Orçamento aceito! 🎉</h2>
          <p className="mt-1 text-sm text-green-700">
            {orgName} receberá sua confirmação em breve.
          </p>
        </div>
        {orgPhone && (
          <a
            href={whatsappLink(orgPhone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            Falar com o buffet no WhatsApp
          </a>
        )}
      </div>
    )
  }

  if (status === 'recusado') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
        <XCircle className="h-12 w-12 text-stone-400" />
        <div>
          <h2 className="text-xl font-bold text-stone-700">Orçamento recusado</h2>
          <p className="mt-1 text-sm text-stone-500">
            Lamentamos. Se tiver dúvidas, entre em contato com {orgName}.
          </p>
        </div>
        {orgPhone && (
          <a
            href={whatsappLink(orgPhone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100"
          >
            <MessageCircle className="h-4 w-4" />
            Falar com o buffet
          </a>
        )}
      </div>
    )
  }

  if (status === 'expirado') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <CalendarX2 className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-amber-700">Orçamento expirado</h2>
        <p className="text-sm text-amber-600">
          O prazo de validade deste orçamento já passou. Entre em contato com {orgName}.
        </p>
      </div>
    )
  }

  return null
}

// ── ItemsTable ────────────────────────────────────────────────
interface ItemsTableProps {
  items: Array<{ description: string; quantity: number; unit_price_cents: number; total_cents: number }>
  totalCents: number | null
}

function ItemsTable({ items, totalCents }: ItemsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <table className="w-full">
        <thead>
          <tr
            className="border-b"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider">
              Descrição
            </th>
            <th className="hidden px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider sm:table-cell">
              Qtd.
            </th>
            <th className="hidden px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider sm:table-cell">
              Unit.
            </th>
            <th className="px-3 py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {items.map((item, i) => (
            <tr
              key={i}
              className="border-b last:border-0 transition-colors hover:bg-orange-50/30"
            >
              <td className="py-3 pl-4 pr-3 text-sm text-gray-800">{item.description}</td>
              <td className="hidden px-3 py-3 text-center text-sm text-gray-600 sm:table-cell">
                {item.quantity}
              </td>
              <td className="hidden px-3 py-3 text-right text-sm text-gray-600 sm:table-cell">
                {fmtBRL(item.unit_price_cents)}
              </td>
              <td className="px-3 py-3 pr-4 text-right text-sm font-semibold text-gray-800">
                {fmtBRL(item.total_cents)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 bg-gray-50">
            <td colSpan={3} className="py-4 pl-4 pr-3 text-right text-sm font-bold uppercase tracking-wider text-gray-700 sm:pr-3">
              Total
            </td>
            <td
              className="py-4 pr-4 text-right text-xl font-extrabold"
              style={{ fontFamily: 'var(--font-display)', color: '#16A34A' }}
            >
              {fmtBRL(totalCents)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── OrcamentoPublico ──────────────────────────────────────────
type PageState = 'loading' | 'ready' | 'not-found' | 'error'
type ActionState = 'idle' | 'accepting' | 'refusing' | 'done-accept' | 'done-refuse'

export default function OrcamentoPublico() {
  const { token } = useParams<{ token: string }>()

  const [pageState,   setPageState]   = useState<PageState>('loading')
  const [quoteData,   setQuoteData]   = useState<PublicQuoteResponse | null>(null)
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [errorMsg,    setErrorMsg]    = useState('')

  useEffect(() => {
    if (!token) { setPageState('not-found'); return }

    getPublicQuote(token)
      .then((data) => {
        setQuoteData(data)
        setPageState('ready')
        // Status que não é 'enviado' — mostrar como resultado
        if (data.quote.status === 'aceito')   setActionState('done-accept')
        if (data.quote.status === 'recusado') setActionState('done-refuse')
      })
      .catch(() => setPageState('not-found'))
  }, [token])

  async function handleAction(action: 'aceito' | 'recusado') {
    if (!token) return
    setActionState(action === 'aceito' ? 'accepting' : 'refusing')
    try {
      const ctx: PublicStatusContext | undefined = (action === 'aceito' && quoteData)
        ? {
            orgId:        quoteData.quote.org_id,
            orgName:      quoteData.organization.name,
            customerName: quoteData.customer?.name ?? 'Cliente',
            total:        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(quoteData.quote.total_cents / 100),
          }
        : undefined
      const result = await updatePublicQuoteStatus(token, action, ctx)
      if (!result.ok) {
        setErrorMsg(result.error ?? 'Erro ao processar resposta.')
        setActionState('idle')
        return
      }
      setActionState(action === 'aceito' ? 'done-accept' : 'done-refuse')
    } catch {
      setErrorMsg('Não foi possível registrar sua resposta. Tente novamente.')
      setActionState('idle')
    }
  }

  // ── Loading ──────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#FAF9F7' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#E8462A' }} />
          <p className="text-sm text-gray-500">Carregando orçamento…</p>
        </div>
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────
  if (pageState === 'not-found' || !quoteData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center" style={{ backgroundColor: '#FAF9F7' }}>
        <LogoMark size={48} />
        <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
          Orçamento não encontrado
        </h1>
        <p className="text-gray-500">
          Este link pode ter expirado ou o orçamento foi removido.
        </p>
      </div>
    )
  }

  const { quote, organization, customer } = quoteData

  const isExpired   = quote.valid_until ? isPast(parseISO(quote.valid_until)) : false
  const isDone      = actionState === 'done-accept' || actionState === 'done-refuse'
  const statusBanner: 'aceito' | 'recusado' | 'expirado' | null =
    actionState === 'done-accept'
      ? 'aceito'
      : actionState === 'done-refuse'
      ? 'recusado'
      : quote.status === 'expirado' || isExpired
      ? 'expirado'
      : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F7', fontFamily: 'Nunito, sans-serif' }}>
      {/* Cabeçalho da marca */}
      <header
        className="px-4 py-4"
        style={{ background: 'linear-gradient(135deg, #16131F 0%, #2a2440 100%)' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={32} />
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
                Orçamento de
              </p>
              <p
                className="text-base font-bold text-white leading-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {organization.name}
              </p>
            </div>
          </div>
          {organization.phone && (
            <a
              href={whatsappLink(organization.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-green-600/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-600"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
        </div>
      </header>

      {/* Corpo */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Destino / cliente */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Para</p>
          <h1
            className="mt-1 text-3xl font-extrabold text-gray-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {customer.name}
          </h1>

          {/* Metadados */}
          <div className="mt-2 flex flex-wrap gap-3">
            {quote.valid_until && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                Válido até{' '}
                {format(parseISO(quote.valid_until), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Gerado por FestaHub
            </div>
          </div>
        </div>

        {/* Observações */}
        {quote.notes && (
          <div className="mb-5 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
              Observações
            </p>
            <p className="mt-1 text-sm text-orange-800">{quote.notes}</p>
          </div>
        )}

        {/* Tabela de itens */}
        <ItemsTable items={quote.items} totalCents={quote.total_cents} />

        {/* Banner de status / resultado */}
        {statusBanner && (
          <div className="mt-6">
            <StatusBanner
              status={statusBanner}
              orgName={organization.name}
              orgPhone={organization.phone}
            />
          </div>
        )}

        {/* Botões de ação — só exibidos quando o status é 'enviado' e não expirado */}
        {quote.status === 'enviado' && !isExpired && !isDone && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => handleAction('aceito')}
              disabled={actionState !== 'idle'}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: '#E8462A', fontFamily: 'var(--font-display)' }}
            >
              {actionState === 'accepting' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              Aceitar orçamento
            </button>

            <button
              onClick={() => handleAction('recusado')}
              disabled={actionState !== 'idle'}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-gray-300 bg-white px-6 py-4 text-base font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {actionState === 'refusing' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              Recusar
            </button>
          </div>
        )}

        {/* Erro de ação */}
        {errorMsg && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Rodapé */}
        <footer className="mt-12 text-center text-xs text-gray-400">
          <div className="mb-2 flex items-center justify-center gap-1.5">
            <LogoMark size={14} />
            <span>Orçamento gerado pelo FestaHub</span>
          </div>
          <p>
            Dúvidas? Entre em contato com{' '}
            <strong className="text-gray-600">{organization.name}</strong>
            {organization.phone && (
              <>
                {' '}via{' '}
                <a
                  href={whatsappLink(organization.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-green-600 hover:underline"
                >
                  WhatsApp
                </a>
              </>
            )}
          </p>
        </footer>
      </main>

      {/* Botão flutuante WhatsApp */}
      {organization.phone && (
        <a
          href={whatsappLink(organization.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg transition-transform hover:scale-110"
          title={`Falar com ${organization.name} no WhatsApp`}
        >
          <MessageCircle className="h-7 w-7 text-white" />
        </a>
      )}
    </div>
  )
}
