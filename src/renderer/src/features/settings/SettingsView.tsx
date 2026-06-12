import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui'
import { cn } from '../../lib/cn'
import { homePath } from '../../lib/format'
import { ipc } from '../../lib/ipc'
import { useRoots } from '../dashboard/useProjects'
import { useAddFolder, useIgnores } from './useFolders'
import { useFrameworkFilter, useSetFrameworkFilter } from './useFrameworkFilter'

export function SettingsView() {
  const qc = useQueryClient()
  const roots = useRoots()
  const ignores = useIgnores()
  const addFolder = useAddFolder()

  async function removeRoot(id: string, path: string) {
    if (!window.confirm(`Stop scanning "${homePath(path)}"?\n\nIts projects are removed from DevDeck (folder on disk is untouched).`))
      return
    await ipc.invoke('roots.remove', { id })
    qc.invalidateQueries({ queryKey: ['roots'] })
    qc.invalidateQueries({ queryKey: ['projects'] })
  }

  async function rescan() {
    await ipc.invoke('index.rescan', {})
  }

  async function restore(path: string) {
    await ipc.invoke('ignores.remove', { path })
    qc.invalidateQueries({ queryKey: ['ignores'] })
    qc.invalidateQueries({ queryKey: ['projects'] })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <h1 className="text-lg font-semibold">Settings</h1>

        {/* Scan folders */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Scan folders</h2>
              <p className="text-xs text-muted">Folders DevDeck scans for projects.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={rescan}>⟳ Rescan all</Button>
              <Button variant="primary" onClick={addFolder}>
                ＋ Add folder
              </Button>
            </div>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {(roots.data?.length ?? 0) === 0 ? (
              <div className="p-4 text-sm text-muted">No folders yet. Add one to discover projects.</div>
            ) : (
              roots.data?.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{homePath(r.path)}</div>
                    <div className="text-xs text-zinc-600">{r.projectCount} projects</div>
                  </div>
                  <button
                    onClick={() => removeRoot(r.id, r.path)}
                    className="shrink-0 rounded px-2 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Framework filter */}
        <FrameworksSection />

        {/* Removed projects */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Removed projects</h2>
            <p className="text-xs text-muted">
              Projects you removed are skipped on re-scan. Restore to bring them back.
            </p>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {(ignores.data?.length ?? 0) === 0 ? (
              <div className="p-4 text-sm text-muted">Nothing removed.</div>
            ) : (
              ignores.data?.map((i) => (
                <div key={i.path} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="truncate text-sm">{homePath(i.path)}</div>
                  <button
                    onClick={() => restore(i.path)}
                    className="shrink-0 rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
                  >
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function FrameworksSection() {
  const { data } = useFrameworkFilter()
  const save = useSetFrameworkFilter()
  if (!data) return null
  const { all, filter } = data

  const toggleEnabled = () => void save({ ...filter, enabled: !filter.enabled })
  const toggleFw = (fw: string) => {
    const allowed = filter.allowed.includes(fw)
      ? filter.allowed.filter((f) => f !== fw)
      : [...filter.allowed, fw]
    void save({ ...filter, allowed })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Project frameworks</h2>
          <p className="text-xs text-muted">
            Only show projects built with the selected frameworks.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={filter.enabled}
          onClick={toggleEnabled}
          className={cn(
            'relative h-5 w-9 rounded-full transition',
            filter.enabled ? 'bg-accent' : 'bg-zinc-600',
          )}
          title={filter.enabled ? 'Filter on' : 'Filter off (all projects shown)'}
        >
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
              filter.enabled ? 'left-[18px]' : 'left-0.5',
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          'flex flex-wrap gap-1.5 rounded-lg border border-border p-3 transition',
          !filter.enabled && 'pointer-events-none opacity-40',
        )}
      >
        {all.map((fw) => {
          const on = filter.allowed.includes(fw)
          return (
            <button
              key={fw}
              onClick={() => toggleFw(fw)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition',
                on
                  ? 'border-accent bg-accent/15 text-content'
                  : 'border-border text-muted hover:text-content',
              )}
            >
              {on && <span className="mr-1 text-accent">✓</span>}
              {fw}
            </button>
          )
        })}
      </div>
      {filter.enabled && filter.allowed.length === 0 && (
        <p className="text-xs text-warning">No frameworks selected — no projects will show.</p>
      )}
    </section>
  )
}
