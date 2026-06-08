import { useProjects, useRoots } from '../dashboard/useProjects'
import { cn } from '../../lib/cn'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◳' },
  { id: 'git', label: 'Git', icon: '⎇', soon: true },
  { id: 'docker', label: 'Docker', icon: '🐳', soon: true },
  { id: 'processes', label: 'Processes', icon: '◉', soon: true },
]

export function Sidebar() {
  const roots = useRoots()
  const all = useProjects({})

  return (
    <nav className="flex w-56 flex-col gap-4 border-r border-border bg-subtle/60 px-2 py-3">
      <div className="px-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">DevDeck</span>
      </div>

      <ul className="space-y-0.5">
        {NAV.map((n) => (
          <li key={n.id}>
            <button
              disabled={n.soon}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition',
                n.id === 'dashboard'
                  ? 'bg-elevated font-medium text-content'
                  : 'text-muted hover:bg-elevated hover:text-content disabled:opacity-40 disabled:hover:bg-transparent',
              )}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>{n.icon}</span>
                {n.label}
              </span>
              {n.id === 'dashboard' && (
                <span className="text-xs text-zinc-600">{all.data?.total ?? 0}</span>
              )}
              {n.soon && <span className="text-[10px] text-zinc-600">soon</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-1 px-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Roots</span>
        {roots.data?.map((r) => (
          <div key={r.id} className="truncate text-xs text-muted" title={r.path}>
            {r.path.split('/').pop()}
            <span className="ml-1 text-zinc-600">({r.projectCount})</span>
          </div>
        ))}
      </div>
    </nav>
  )
}
