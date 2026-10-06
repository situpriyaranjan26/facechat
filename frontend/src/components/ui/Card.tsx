import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  className,
  glow = false,
  padding = 'md',
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          'bg-bg-surface border border-border rounded-2xl',
          'backdrop-blur-sm',
          paddingClasses[padding],
          glow && 'shadow-brand border-brand-primary/30',
          onClick && 'cursor-pointer hover:border-brand-primary/50 transition-all duration-200',
          className
        )
      )}
    >
      {children}
    </div>
  )
}

export function GlassCard({
  children,
  className,
  padding = 'md',
}: Pick<CardProps, 'children' | 'className' | 'padding'>) {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-glass',
          paddingClasses[padding],
          className
        )
      )}
    >
      {children}
    </div>
  )
}
