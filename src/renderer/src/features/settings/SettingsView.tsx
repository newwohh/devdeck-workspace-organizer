import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui'
import { homePath } from '../../lib/format'
import { ipc } from '../../lib/ipc'
import { useRoots } from '../dashboard/useProjects'
import { useAddFolder, useIgnores } from './useFolders'

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
