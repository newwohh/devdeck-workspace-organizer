import type { ProjectSummary } from '@shared/schemas/project'
import { Badge, StatusDot } from '../../components/ui'
import { cn } from '../../lib/cn'
import { homePath, langColor, relativeTime, typeIcon } from '../../lib/format'

export function ProjectCard({
  project,
  selected,
  onSelect,
  onToggleFavorite,
  onOpen,
}: {
  project: ProjectSummary
  selected: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onOpen: (target: 'editor' | 'finder') => void
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex cursor-default flex-col gap-3 rounded-xl border bg-subtle p-4 transition',
        selected ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-zinc-500/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted" aria-hidden>
            {typeIcon(project.type)}
          </span>
          <span className="truncate font-medium">{project.name}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={cn(
            'text-sm transition',
            project.favorite ? 'text-yellow-400' : 'text-zinc-600 opacity-0 group-hover:opacity-100',
          )}
          aria-label={project.favorite ? 'Unfavorite' : 'Favorite'}
        >
          ★
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {project.frameworks.slice(0, 3).map((f) => (
          <Badge key={f}>{f}</Badge>
        ))}
        {project.frameworks.length > 3 && <Badge>+{project.frameworks.length - 3}</Badge>}
        {project.frameworks.length === 0 && <Badge className="capitalize">{project.type}</Badge>}
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: langColor(project.primaryLanguage) }}
            aria-hidden
          />
          {project.primaryLanguage ?? 'unknown'}
        </span>
        <span>{relativeTime(project.fsModifiedAt)}</span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <StatusDot level={project.health} label={`health: ${project.health}`} />
          {project.category ?? 'Uncategorized'}
        </span>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpen('editor')
            }}
            className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-elevated hover:text-content"
          >
            Open
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpen('finder')
            }}
            className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-elevated hover:text-content"
          >
            Reveal
          </button>
        </div>
      </div>

      <div className="truncate text-[11px] text-zinc-600" title={project.path}>
        {homePath(project.path)}
      </div>
    </div>
  )
}
