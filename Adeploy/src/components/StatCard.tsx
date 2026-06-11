import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Trend = 'up' | 'down' | 'neutral'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  iconColor?: string
  trend?: Trend
  trendLabel?: string
  className?: string
}

const trendConfig: Record<Trend, { icon: LucideIcon; color: string }> = {
  up:      { icon: TrendingUp,   color: 'text-success' },
  down:    { icon: TrendingDown, color: 'text-destructive' },
  neutral: { icon: Minus,        color: 'text-muted-foreground' },
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  trendLabel,
  className,
}: StatCardProps) {
  const TrendIcon = trend ? trendConfig[trend].icon : null
  const trendColor = trend ? trendConfig[trend].color : ''

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-5 transition-shadow hover:shadow-md',
        className,
      )}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Background decoration */}
      <div
        className="absolute right-0 top-0 h-20 w-20 rounded-full opacity-5 blur-2xl"
        style={{ background: 'var(--color-primary)', transform: 'translate(30%, -30%)' }}
      />

      <div className="flex items-start justify-between">
        {/* Icon */}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: 'var(--color-primary-light)' }}
        >
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>

        {/* Trend */}
        {trend && TrendIcon && trendLabel && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{trendLabel}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className="mt-1 text-2xl font-700 text-foreground"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}
