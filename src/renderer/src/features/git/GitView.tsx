import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, StatusDot } from '../../components/ui'
import { homePath, relativeTime } from '../../lib/format'
import { ipc } from '../../lib/ipc'

export function GitView() {
  const [dirtyOnly, setDirtyOnly] = useState(false)
  const repos = useQuery({
    queryKey: ['git', 'statusAll'],
    queryFn: () => ipc.invoke('git.statusAll', undefined),
  })

  const rows = (repos.data ?? []).filter((r) => !dirtyOnly || r.git.dirty || r.git.conflicted || r.git.behind > 0)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <h1 className="text-sm font-semibold">Git · all repositories</h1>
        <span className="text-xs text-zinc-600">{rows.length} shown</span>
        <label className="ml-2 flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={dirtyOnly} onChange={(e) => setDirtyOnly(e.target.checked)} />
          Needs attention only
        </label>
        <Button className="ml-auto" onClick={() => ipc.invoke('git.refresh', {})}>
          ⟳ Refresh
        </Button>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr_auto_1.2fr] gap-3 border-b border-border bg-subtle/50 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        <span>Repository</span>
        <span>Branch</span>
        <span>State</span>
        <span>Last commit</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {repos.isLoading ? (
          <div className="p-5 text-sm text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-sm text-muted">No repositories {dirtyOnly ? 'need attention' : 'found yet'}.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.projectId}
              className="grid grid-cols-[1.4fr_1fr_auto_1.2fr] items-center gap-3 border-b border-border px-5 py-2.5 text-sm hover:bg-elevated/50"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{r.name}</span>
                <span className="truncate text-[11px] text-zinc-600">{homePath(r.path)}</span>
              </span>

              <span className="flex items-center gap-1.5 text-xs">
                <span aria-hidden>⎇</span>
                <span className="truncate">{r.git.branch ?? 'detached'}</span>
              </span>

              <span className="flex items-center gap-2 text-xs">
                <StatusDot level={healthDot(r.git.health)} label={r.git.health} />
                <span className="capitalize text-muted">{r.git.health}</span>
                {r.git.dirty && (
                  <span className="text-warning">
                    {r.git.staged + r.git.modified + r.git.untracked} changes
                  </span>
                )}
                {r.git.ahead > 0 && <span className="text-muted">↑{r.git.ahead}</span>}
                {r.git.behind > 0 && <span className="text-warning">↓{r.git.behind}</span>}
              </span>

              <span className="flex min-w-0 flex-col text-xs">
                <span className="truncate text-muted">{r.git.lastCommit?.message ?? '—'}</span>
                <span className="text-[11px] text-zinc-600">
                  {r.git.lastCommit ? `${r.git.lastCommit.author} · ${relativeTime(r.git.lastCommit.at)}` : ''}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function healthDot(health: string): string {
  if (health === 'clean') return 'ok'
  if (health === 'conflicted') return 'error'
  if (health === 'dirty' || health === 'behind') return 'warn'
  return 'unknown'
}
