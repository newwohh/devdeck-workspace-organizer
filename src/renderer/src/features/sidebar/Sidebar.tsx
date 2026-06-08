import type { AppView } from '../../store/ui'
import { useUIStore } from '../../store/ui'
import { useProjects, useRoots } from '../dashboard/useProjects'
import { cn } from '../../lib/cn'

const NAV: { id: AppView | string; label: string; icon: string; soon?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◳' },
  { id: 'git', label: 'Git', icon: '⎇' },
  { id: 'processes', label: 'Processes', icon: '◉' },
  { id: 'docker', label: 'Docker', icon: '🐳', soon: true },
]

export function Sidebar() {
  const roots = useRoots()
  const all = useProjects({})
  const { activeView, setActiveView } = useUIStore()

  return (
    <nav className="flex w-56 flex-col gap-4 border-r border-border bg-subtle/60 px-2 py-3">
      <div className="px-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">DevDeck</span>
      </div>

      <ul className="space-y-0.5">
        {NAV.map((n) => {
          const active = n.id === activeView
          return (
            <li key={n.id}>
              <button
                disabled={n.soon}
                onClick={() => !n.soon && setActiveView(n.id as AppView)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition',
                  active
                    ? 'bg-elevated font-medium text-content'
                    : 'text-muted hover:bg-elevated hover:text-content disabled:opacity-40 disabled:hover:bg-transparent',
                )}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden>{n.icon}</span>
                  {n.label}
                </span>
                {n.id === 'dashboard' && <span className="text-xs text-zinc-600">{all.data?.total ?? 0}</span>}
                {n.soon && <span className="text-[10px] text-zinc-600">soon</span>}
              </button>
            </li>
          )
        })}
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
