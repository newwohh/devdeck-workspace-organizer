import { useQueryClient } from '@tanstack/react-query'
import { ipc } from '../../lib/ipc'
import { useUIStore } from '../../store/ui'
import { EmptyState } from '../roots/EmptyState'
import { ProjectCard } from './ProjectCard'
import { ProjectListRow } from './ProjectListRow'
import { Toolbar } from './Toolbar'
import { useProjects, useRoots } from './useProjects'

export function Dashboard() {
  const qc = useQueryClient()
  const { view, filter, selectedId, select, scan } = useUIStore()
  const roots = useRoots()
  const projects = useProjects(filter)

  const items = projects.data?.items ?? []
  const hasRoots = (roots.data?.length ?? 0) > 0

  async function addRoot() {
    const picked = await ipc.invoke('roots.pick', undefined)
    if (!picked.path) return
    await ipc.invoke('roots.add', { path: picked.path })
    qc.invalidateQueries({ queryKey: ['roots'] })
  }

  async function rescan() {
    await ipc.invoke('index.rescan', {})
  }

  async function toggleFavorite(id: string) {
    await ipc.invoke('projects.toggleFavorite', { id })
    qc.invalidateQueries({ queryKey: ['projects'] })
  }

  function open(id: string, target: 'editor' | 'finder') {
    void ipc.invoke('projects.open', { id, target })
  }

  if (roots.isLoading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted">Loading…</div>
  }

  if (!hasRoots) {
    return <EmptyState onAddRoot={addRoot} busy={scan.active} />
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Toolbar count={projects.data?.total ?? 0} onRescan={rescan} />

      {scan.active && (
        <div className="border-b border-border bg-accent/5 px-5 py-1.5 text-xs text-muted">
          Scanning… {scan.scanned} dirs examined · {scan.found} projects found
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">
          No projects match this filter.
        </div>
      ) : view === 'grid' ? (
        <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 overflow-y-auto p-5">
          {items.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              selected={selectedId === p.id}
              onSelect={() => select(p.id)}
              onToggleFavorite={() => toggleFavorite(p.id)}
              onOpen={(t) => open(p.id, t)}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {items.map((p) => (
            <ProjectListRow
              key={p.id}
              project={p}
              selected={selectedId === p.id}
              onSelect={() => select(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
