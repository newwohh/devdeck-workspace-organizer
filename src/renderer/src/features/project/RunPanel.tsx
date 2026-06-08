import { useEffect, useRef, useState } from 'react'
import type { ProjectScript } from '@shared/schemas/project'
import { stripAnsi } from '../../lib/ansi'
import { ipc } from '../../lib/ipc'

const KIND_ORDER: Record<string, number> = { dev: 0, start: 1, build: 2, test: 3, lint: 4, migrate: 5, other: 6 }

/** Runs a project's scripts and streams their output inline. */
export function RunPanel({ projectId, scripts }: { projectId: string; scripts: ProjectScript[] }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [activeScript, setActiveScript] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')
  const preRef = useRef<HTMLPreElement>(null)

  // Restore an in-flight session when (re)opening this project.
  useEffect(() => {
    let cancelled = false
    setSessionId(null)
    setActiveScript(null)
    setRunning(false)
    setOutput('')
    void ipc.invoke('scripts.sessions', undefined).then(async (sessions) => {
      const mine = sessions.filter((s) => s.projectId === projectId)
      const pick = mine.find((s) => s.running) ?? mine[0]
      if (cancelled || !pick) return
      const { data } = await ipc.invoke('scripts.output', { sessionId: pick.sessionId })
      if (cancelled) return
      setSessionId(pick.sessionId)
      setActiveScript(pick.scriptName)
      setRunning(pick.running)
      setOutput(stripAnsi(data))
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Live output for the active session.
  useEffect(() => {
    if (!sessionId) return
    const offData = ipc.on('events.terminal.data', (c) => {
      if (c.sessionId !== sessionId) return
      setOutput((o) => (o + stripAnsi(c.data)).slice(-40_000))
    })
    const offExit = ipc.on('events.terminal.exit', (e) => {
      if (e.sessionId === sessionId) setRunning(false)
    })
    return () => {
      offData()
      offExit()
    }
  }, [sessionId])

  useEffect(() => {
    preRef.current?.scrollTo(0, preRef.current.scrollHeight)
  }, [output])

  async function run(name: string) {
    setOutput('')
    setActiveScript(name)
    setRunning(true)
    const res = await ipc.invoke('scripts.run', { projectId, scriptName: name })
    setSessionId(res.sessionId)
  }

  async function stop() {
    if (sessionId) await ipc.invoke('scripts.stop', { sessionId })
  }

  const ordered = [...scripts].sort(
    (a, b) => (KIND_ORDER[a.kind ?? 'other'] ?? 9) - (KIND_ORDER[b.kind ?? 'other'] ?? 9),
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {ordered.map((s) => (
          <button
            key={s.name}
            onClick={() => run(s.name)}
            disabled={running && activeScript === s.name}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2 py-1 text-xs hover:border-accent disabled:opacity-50"
            title={s.command}
          >
            <span className="text-success">▶</span>
            {s.name}
          </button>
        ))}
      </div>

      {activeScript && (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between bg-elevated px-2 py-1">
            <span className="flex items-center gap-1.5 text-xs">
              <span className={running ? 'text-success' : 'text-zinc-500'}>●</span>
              <span className="font-medium">{activeScript}</span>
              <span className="text-zinc-600">{running ? 'running' : 'stopped'}</span>
            </span>
            {running && (
              <button onClick={stop} className="rounded px-1.5 py-0.5 text-xs text-danger hover:bg-danger/10">
                Stop
              </button>
            )}
          </div>
          <pre
            ref={preRef}
            className="max-h-52 overflow-auto whitespace-pre-wrap bg-black/40 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-zinc-300"
          >
            {output || 'Starting…'}
          </pre>
        </div>
      )}
    </div>
  )
}
