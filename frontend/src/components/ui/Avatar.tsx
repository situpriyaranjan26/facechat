import { clsx } from 'clsx'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getGradient(name?: string): string {
  const gradients = [
    'from-brand-primary to-brand-secondary',
    'from-brand-accent to-brand-primary',
    'from-brand-secondary to-brand-accent',
    'from-purple-600 to-pink-500',
    'from-cyan-500 to-purple-600',
  ]
  if (!name) return gradients[0]
  const idx = name.charCodeAt(0) % gradients.length
  return gradients[idx]
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeClasses[size]
  const gradient = getGradient(name)
  const initials = getInitials(name)

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || 'Avatar'}
        className={clsx(
          'rounded-full object-cover flex-shrink-0 border-2 border-border',
          sizeClass,
          className
        )}
      />
    )
  }

  return (
    <div
      className={clsx(
        'rounded-full flex-shrink-0 flex items-center justify-center',
        `bg-gradient-to-br ${gradient}`,
        'font-bold text-white border-2 border-white/10',
        sizeClass,
        className
      )}
      aria-label={name}
    >
      {initials}
    </div>
  )
}
