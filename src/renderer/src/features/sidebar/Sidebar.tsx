import type { AppView } from '../../store/ui'
import { useUIStore } from '../../store/ui'
import { useProjects, useRoots } from '../dashboard/useProjects'
import { useAddFolder } from '../settings/useFolders'
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
  const addFolder = useAddFolder()

  const navItem = (id: AppView, label: string, icon: string, soon = false, badge?: number) => {
    const active = id === activeView
    return (
      <button
        disabled={soon}
        onClick={() => !soon && setActiveView(id)}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition',
          active
            ? 'bg-elevated font-medium text-content'
            : 'text-muted hover:bg-elevated hover:text-content disabled:opacity-40 disabled:hover:bg-transparent',
        )}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>{icon}</span>
          {label}
        </span>
        {badge !== undefined && <span className="text-xs text-zinc-600">{badge}</span>}
        {soon && <span className="text-[10px] text-zinc-600">soon</span>}
      </button>
    )
  }

  return (
    <nav className="flex w-56 flex-col gap-4 border-r border-border bg-subtle/60 px-2 py-3">
      <div className="px-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">DevDeck</span>
      </div>

      <ul className="space-y-0.5">
        {NAV.map((n) => (
          <li key={n.id}>
            {navItem(n.id as AppView, n.label, n.icon, n.soon, n.id === 'dashboard' ? (all.data?.total ?? 0) : undefined)}
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-1 px-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Folders</span>
          <button
            onClick={addFolder}
            title="Add a folder to scan"
            className="rounded px-1 text-sm text-muted hover:bg-elevated hover:text-content"
          >
            ＋
          </button>
        </div>
        {roots.data?.length === 0 && <div className="text-xs text-zinc-600">None yet</div>}
        {roots.data?.map((r) => (
          <div key={r.id} className="truncate text-xs text-muted" title={r.path}>
            {r.path.split('/').pop()}
            <span className="ml-1 text-zinc-600">({r.projectCount})</span>
          </div>
        ))}
      </div>

      {navItem('settings', 'Settings', '⚙', false)}
    </nav>
  )
}
