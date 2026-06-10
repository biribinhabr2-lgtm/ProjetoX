import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

function BalloonIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className="animate-float"
    >
      {/* Balloon 1 – coral */}
      <ellipse cx="38" cy="42" rx="18" ry="22" fill="#E8462A" opacity="0.9" />
      <path d="M38 64 Q36 72 34 78" stroke="#E8462A" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="38" cy="38" rx="6" ry="4" fill="white" opacity="0.25" transform="rotate(-25 38 38)" />

      {/* Balloon 2 – amber */}
      <ellipse cx="60" cy="34" rx="20" ry="24" fill="#F9A826" opacity="0.9" />
      <path d="M60 58 Q58 68 56 76" stroke="#F9A826" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="60" cy="29" rx="7" ry="4.5" fill="white" opacity="0.25" transform="rotate(-20 60 29)" />

      {/* Balloon 3 – teal */}
      <ellipse cx="83" cy="45" rx="17" ry="21" fill="#0EA5E9" opacity="0.85" />
      <path d="M83 66 Q81 73 79 80" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="83" cy="41" rx="5.5" ry="3.5" fill="white" opacity="0.25" transform="rotate(-25 83 41)" />

      {/* Confetti dots */}
      <circle cx="22" cy="20" r="3" fill="#E8462A" opacity="0.4" />
      <circle cx="95" cy="18" r="2.5" fill="#F9A826" opacity="0.5" />
      <circle cx="15" cy="58" r="2" fill="#0EA5E9" opacity="0.3" />
      <circle cx="105" cy="55" r="3" fill="#E8462A" opacity="0.35" />
      <rect x="48" y="10" width="4" height="4" rx="1" fill="#F9A826" opacity="0.4" transform="rotate(20 48 10)" />
      <rect x="72" y="12" width="3" height="3" rx="1" fill="#E8462A" opacity="0.35" transform="rotate(-15 72 12)" />

      {/* String knots */}
      <circle cx="38" cy="64" r="2" fill="#E8462A" opacity="0.6" />
      <circle cx="60" cy="58" r="2" fill="#F9A826" opacity="0.6" />
      <circle cx="83" cy="66" r="2" fill="#0EA5E9" opacity="0.6" />

      {/* Ground ribbon */}
      <path d="M28 88 Q60 95 92 88" stroke="#E7E5E0" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center',
        className,
      )}
    >
      <BalloonIllustration />

      <h3
        className="mt-6 text-lg font-semibold text-foreground"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
