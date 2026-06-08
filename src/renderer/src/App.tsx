import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ipc } from './lib/ipc'

/**
 * Phase 0 shell: proves the full stack end to end —
 *   renderer → typed bridge → validated IPC → main handler → SQLite → back.
 * It deliberately exercises an invoke (appInfo), a round-trip (ping), a
 * mutation + read (settings), and a main→renderer event subscription.
 */
export function App(): JSX.Element {
  const appInfo = useQuery({
    queryKey: ['system', 'appInfo'],
    queryFn: () => ipc.invoke('system.appInfo', undefined),
  })

  const [pong, setPong] = useState<string>('—')
  const [lastEvent, setLastEvent] = useState<string>('none yet')

  useEffect(() => {
    return ipc.on('events.settings.changed', (p) => {
      setLastEvent(`${p.key} = ${JSON.stringify(p.value)}`)
    })
  }, [])

  async function ping() {
    const res = await ipc.invoke('system.ping', { message: 'hello' })
    setPong(`${res.reply} (pid ${res.pid})`)
  }

  async function bumpCounter() {
    const current = await ipc.invoke('settings.get', { key: 'demo.counter' })
    const next = (typeof current.value === 'number' ? current.value : 0) + 1
    await ipc.invoke('settings.set', { key: 'demo.counter', value: next })
  }

  return (
    <div className="flex h-screen flex-col bg-base text-content">
      <header className="drag-region flex h-12 items-center justify-center border-b border-border text-sm font-medium">
        DevDeck
      </header>

      <main className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-subtle p-6 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold">Phase 0 — wiring verified</h1>
            <p className="text-sm text-muted">Secure IPC · SQLite migrations · live events</p>
          </div>

          <dl className="space-y-1 text-sm">
            <Row label="App" value={appInfo.data ? `${appInfo.data.name} v${appInfo.data.version}` : '…'} />
            <Row label="Electron" value={appInfo.data?.electron ?? '…'} />
            <Row label="Node" value={appInfo.data?.node ?? '…'} />
            <Row label="Ping" value={pong} />
            <Row label="Last event" value={lastEvent} />
          </dl>

          <div className="flex gap-2">
            <button
              onClick={ping}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Ping main
            </button>
            <button
              onClick={bumpCounter}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-elevated"
            >
              Bump setting
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-xs">{value}</dd>
    </div>
  )
}
