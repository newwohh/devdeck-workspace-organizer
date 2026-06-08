import type { ProjectSummary } from '@shared/schemas/project'
import { Badge, StatusDot } from '../../components/ui'
import { cn } from '../../lib/cn'
import { homePath, langColor, relativeTime, typeIcon } from '../../lib/format'

export function ProjectListRow({
  project,
  selected,
  onSelect,
}: {
  project: ProjectSummary
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'grid w-full grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-3 border-b border-border px-3 py-2 text-left text-sm transition',
        selected ? 'bg-elevated' : 'hover:bg-elevated/60',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {project.favorite && <span className="text-yellow-400">★</span>}
        <span className="text-muted" aria-hidden>
          {typeIcon(project.type)}
        </span>
        <span className="truncate font-medium">{project.name}</span>
        <span className="truncate text-xs text-zinc-600">{homePath(project.path)}</span>
      </span>

      <span className="flex flex-wrap gap-1">
        {project.frameworks.slice(0, 2).map((f) => (
          <Badge key={f}>{f}</Badge>
        ))}
        {project.frameworks.length === 0 && <Badge className="capitalize">{project.type}</Badge>}
      </span>

      <span className="flex items-center gap-1.5 text-xs text-muted">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: langColor(project.primaryLanguage) }}
          aria-hidden
        />
        {project.primaryLanguage ?? '—'}
      </span>

      <span className="flex items-center gap-3 text-xs text-muted">
        <span>{relativeTime(project.fsModifiedAt)}</span>
        <StatusDot level={project.health} label={`health: ${project.health}`} />
      </span>
    </button>
  )
}
