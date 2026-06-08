import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

export function Button({
  variant = 'default',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-white hover:opacity-90',
        variant === 'default' && 'border border-border bg-elevated hover:bg-subtle',
        variant === 'ghost' && 'text-muted hover:bg-elevated hover:text-content',
        className,
      )}
      {...props}
    />
  )
}

export function Badge({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-elevated px-1.5 py-0.5 text-[11px] font-medium text-muted',
        className,
      )}
    >
      {children}
    </span>
  )
}

const HEALTH: Record<string, string> = {
  ok: 'bg-success',
  warn: 'bg-warning',
  error: 'bg-danger',
  unknown: 'bg-zinc-500',
}

export function StatusDot({ level, label }: { level: string; label?: string }) {
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', HEALTH[level] ?? HEALTH.unknown)}
      role="img"
      aria-label={label ?? level}
      title={label ?? level}
    />
  )
}
