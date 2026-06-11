import { cn } from '@/lib/utils'
import type { EventStatus, QuoteStatus } from '@/types/database'

type AnyStatus = EventStatus | QuoteStatus

interface StatusConfig {
  label: string
  bgVar: string
  colorVar: string
}

const eventStatusConfig: Record<EventStatus, StatusConfig> = {
  orcamento:  { label: 'Orçamento',  bgVar: 'var(--color-status-orcamento-bg)',   colorVar: 'var(--color-status-orcamento)'   },
  confirmada: { label: 'Confirmada', bgVar: 'var(--color-status-confirmada-bg)', colorVar: 'var(--color-status-confirmada)' },
  realizada:  { label: 'Realizada',  bgVar: 'var(--color-status-realizada-bg)',  colorVar: 'var(--color-status-realizada)'  },
  cancelada:  { label: 'Cancelada',  bgVar: 'var(--color-status-cancelada-bg)',  colorVar: 'var(--color-status-cancelada)'  },
}

const quoteStatusConfig: Record<QuoteStatus, StatusConfig> = {
  enviado:  { label: 'Enviado',  bgVar: 'var(--color-status-confirmada-bg)', colorVar: 'var(--color-status-confirmada)' },
  aceito:   { label: 'Aceito',   bgVar: 'var(--color-status-realizada-bg)',  colorVar: 'var(--color-status-realizada)'  },
  recusado: { label: 'Recusado', bgVar: 'var(--color-status-cancelada-bg)',  colorVar: 'var(--color-status-cancelada)'  },
  expirado: { label: 'Expirado', bgVar: 'var(--color-status-cancelada-bg)',  colorVar: 'var(--color-status-cancelada)'  },
}

const allConfigs: Record<AnyStatus, StatusConfig> = {
  ...eventStatusConfig,
  ...quoteStatusConfig,
}

interface StatusBadgeProps {
  status: AnyStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = allConfigs[status]
  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-600 leading-none',
        className,
      )}
      style={{
        backgroundColor: config.bgVar,
        color: config.colorVar,
        fontWeight: 600,
      }}
    >
      <span
        className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.colorVar }}
      />
      {config.label}
    </span>
  )
}
