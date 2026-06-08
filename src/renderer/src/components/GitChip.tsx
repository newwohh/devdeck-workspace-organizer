import type { GitStatusLite } from '@shared/schemas/git'
import { cn } from '../lib/cn'

const HEALTH_TEXT: Record<string, string> = {
  clean: 'text-muted',
  dirty: 'text-warning',
  behind: 'text-warning',
  conflicted: 'text-danger',
  detached: 'text-muted',
  unknown: 'text-zinc-600',
}

/** Compact git indicator: branch · dirty dot · ahead/behind. */
export function GitChip({ git, className }: { git?: GitStatusLite; className?: string }) {
  if (!git?.isRepo) return null
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[11px]', HEALTH_TEXT[git.health], className)}
      title={`git: ${git.health}`}
    >
      <span aria-hidden>⎇</span>
      <span className="max-w-[90px] truncate font-medium">{git.branch ?? 'detached'}</span>
      {git.dirty && <span className="text-warning" title="uncommitted changes">●</span>}
      {git.conflicted && <span className="text-danger" title="merge conflict">⚠</span>}
      {git.ahead > 0 && <span title={`${git.ahead} ahead`}>↑{git.ahead}</span>}
      {git.behind > 0 && <span title={`${git.behind} behind`}>↓{git.behind}</span>}
    </span>
  )
}
