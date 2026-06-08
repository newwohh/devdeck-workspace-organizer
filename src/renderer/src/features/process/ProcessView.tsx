import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui'
import { ipc } from '../../lib/ipc'

function fmtMem(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
}

export function ProcessView() {
  const procs = useQuery({
    queryKey: ['processes'],
    queryFn: () => ipc.invoke('process.list', undefined),
    refetchInterval: 5000,
  })

  const rows = procs.data ?? []

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <h1 className="text-sm font-semibold">Running services</h1>
        <span className="text-xs text-zinc-600">{rows.length} listening</span>
        <Button className="ml-auto" onClick={() => procs.refetch()}>
          ⟳ Refresh
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_1.2fr_auto_auto_auto_auto] gap-3 border-b border-border bg-subtle/50 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        <span>Service</span>
        <span>Project</span>
        <span>Port</span>
        <span>CPU</span>
        <span>Memory</span>
        <span></span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {procs.isLoading ? (
          <div className="p-5 text-sm text-muted">Scanning ports…</div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-sm text-muted">
            No dev servers are currently listening. Start one from a project&apos;s scripts.
          </div>
        ) : (
          rows.map((p) => (
            <div
              key={`${p.pid}:${p.port}`}
              className="grid grid-cols-[1fr_1.2fr_auto_auto_auto_auto] items-center gap-3 border-b border-border px-5 py-2.5 text-sm hover:bg-elevated/50"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{p.name}</span>
                <span className="truncate text-[11px] text-zinc-600">pid {p.pid}</span>
              </span>
              <span className="truncate text-xs text-muted">{p.projectName ?? '—'}</span>
              <button
                onClick={() => p.url && ipc.invoke('urls.open', { url: p.url })}
                className="justify-self-start rounded bg-elevated px-1.5 py-0.5 font-mono text-xs text-accent hover:underline"
                title={p.url}
              >
                :{p.port}
              </button>
              <span className="text-xs tabular-nums text-muted">{p.cpu.toFixed(0)}%</span>
              <span className="text-xs tabular-nums text-muted">{fmtMem(p.memoryBytes)}</span>
              <button
                onClick={() => ipc.invoke('process.kill', { pid: p.pid })}
                className="justify-self-end rounded px-1.5 py-0.5 text-xs text-danger hover:bg-danger/10"
              >
                Kill
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
