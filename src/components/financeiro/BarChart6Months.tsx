/**
 * BarChart6Months — barras de receita × despesa dos últimos 6 meses.
 *
 * Regra 7: todos os valores vêm em centavos; recharts recebe centavos
 * e o tickFormatter converte para exibição BRL apenas no eixo/tooltip.
 * Nenhuma soma usa float — os dados já chegam somados do service.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { MonthSummary } from '@/services/transactions'

// ── Helpers de formatação (apenas para exibição) ──────────────
const fmtBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
    // Sem casas decimais no eixo — mais limpo
    maximumFractionDigits: 0,
  }).format(cents / 100)

const fmtMonthLabel = (year: number, month: number) =>
  format(new Date(year, month - 1, 1), 'MMM', { locale: ptBR })
    .replace('.', '')
    .toUpperCase()

// ── Tooltip customizado ───────────────────────────────────────
interface TooltipPayloadEntry {
  name:  string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: TooltipPayloadEntry[]
  label?:   string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {fmtBRL(entry.value)}
        </p>
      ))}
      {payload.length === 2 && (
        <p
          className="mt-1 border-t pt-1 text-sm font-semibold"
          style={{
            color: payload[0].value >= payload[1].value
              ? 'var(--color-success)'
              : 'var(--color-destructive)',
          }}
        >
          Saldo: {fmtBRL(payload[0].value - payload[1].value)}
        </p>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────
interface BarChart6MonthsProps {
  data: MonthSummary[]
}

// ── BarChart6Months ───────────────────────────────────────────
export function BarChart6Months({ data }: BarChart6MonthsProps) {
  if (data.length === 0) return null

  const chartData = data.map((m) => ({
    label:   fmtMonthLabel(m.year, m.month),
    Receita: m.receita_cents,   // centavos — regra 7
    Despesa: m.despesa_cents,   // centavos — regra 7
  }))

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-6">
      <p
        className="mb-4 text-sm font-semibold"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Receitas × Despesas — últimos 6 meses
      </p>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={chartData}
          barCategoryGap="30%"
          barGap={4}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtBRL}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => (
              <span style={{ color: value === 'Receita' ? '#16A34A' : '#DC2626' }}>{value}</span>
            )}
          />
          <Bar
            dataKey="Receita"
            fill="#16A34A"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="Despesa"
            fill="#DC2626"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
