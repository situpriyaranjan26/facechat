import { clsx } from 'clsx'
import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-text-muted flex-shrink-0">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full bg-bg-surface2 border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary',
              'transition-all duration-200',
              error
                ? 'border-status-error focus:ring-status-error/50 focus:border-status-error'
                : 'border-border hover:border-border/80',
              icon && 'pl-10',
              iconRight && 'pr-10',
              className
            )}
            {...props}
          />

          {iconRight && (
            <span className="absolute right-3 text-text-muted flex-shrink-0">
              {iconRight}
            </span>
          )}
        </div>

        {error && <p className="text-xs text-status-error">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full bg-bg-surface2 border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted resize-none',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary',
            'transition-all duration-200',
            error
              ? 'border-status-error'
              : 'border-border hover:border-border/80',
            className
          )}
          {...props}
        />

        {error && <p className="text-xs text-status-error">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
