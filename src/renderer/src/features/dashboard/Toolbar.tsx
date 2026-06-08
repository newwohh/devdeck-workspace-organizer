import type { ProjectType } from '@shared/schemas/project'
import { Button } from '../../components/ui'
import { cn } from '../../lib/cn'
import { useUIStore } from '../../store/ui'

const TYPES: ProjectType[] = ['app', 'service', 'library', 'monorepo', 'cli', 'theme', 'infra']

export function Toolbar({ count, onRescan }: { count: number; onRescan: () => void }) {
  const { view, setView, filter, setText, toggleType, setSort } = useUIStore()
  const activeTypes = new Set(filter.types ?? [])

  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-3">
      <div className="flex items-center gap-3">
        <input
          value={filter.text ?? ''}
          onChange={(e) => setText(e.target.value)}
          placeholder="Filter projects…"
          className="h-8 flex-1 rounded-md border border-border bg-base px-3 text-sm outline-none focus:border-accent"
        />
        <div className="flex items-center rounded-md border border-border p-0.5">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded px-2 py-1 text-xs capitalize transition',
                view === v ? 'bg-elevated text-content' : 'text-muted hover:text-content',
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <select
          value={filter.sort?.by ?? 'modified'}
          onChange={(e) => setSort(e.target.value as never)}
          className="h-8 rounded-md border border-border bg-base px-2 text-xs outline-none"
          aria-label="Sort by"
        >
          <option value="modified">Modified</option>
          <option value="name">Name</option>
          <option value="type">Type</option>
        </select>
        <Button onClick={onRescan} title="Rescan all roots">
          ⟳ Rescan
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-zinc-600">{count} projects</span>
        <span className="text-zinc-700">·</span>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs capitalize transition',
              activeTypes.has(t)
                ? 'border-accent bg-accent/15 text-content'
                : 'border-border text-muted hover:text-content',
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
