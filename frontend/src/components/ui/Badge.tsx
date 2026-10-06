import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'coin'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-surface2 text-text-muted border border-border',
  success: 'bg-status-success/20 text-status-success border border-status-success/30',
  warning: 'bg-status-warning/20 text-status-warning border border-status-warning/30',
  error: 'bg-status-error/20 text-status-error border border-status-error/30',
  info: 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30',
  purple: 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30',
  coin: 'bg-coin/20 text-coin border border-coin/30',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-muted',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
  info: 'bg-brand-accent',
  purple: 'bg-brand-primary',
  coin: 'bg-coin',
}

export function Badge({
  children,
  variant = 'default',
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
          variantClasses[variant],
          className
        )
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse',
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  )
}
