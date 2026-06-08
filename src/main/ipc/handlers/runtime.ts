import { shell, type BrowserWindow } from 'electron'
import { projectRepo } from '../../db/project-repo'
import { ProcessMonitor } from '../../engines/process/monitor'
import { RunManager } from '../../engines/process/run-manager'
import { handle } from '../router'

const POLL_FOCUSED_MS = 4000
const POLL_BLURRED_MS = 15000

/** Registers process-monitoring, script-runner, and url handlers, and starts
 * the focus-aware process poller. Returns a disposer. */
export function registerRuntimeHandlers(getWindow: () => BrowserWindow | null): () => void {
  const send = (channel: string, payload: unknown) => getWindow()?.webContents.send(channel, payload)

  const monitor = new ProcessMonitor(() => send('events.process.changed', {}))
  const runner = new RunManager({
    data: (chunk) => send('events.terminal.data', chunk),
    exit: (sessionId, code) => send('events.terminal.exit', { sessionId, code }),
  })

  // ─── Processes / ports ──────────────────────────────────────────────────────
  handle('process.list', async () => {
    if (monitor.current().length === 0) await monitor.refresh()
    return monitor.current()
  })

  handle('process.kill', (input) => {
    // Safety guard: DevDeck will only ever signal a process it has itself
    // detected as a local dev server (listening on a TCP port). It is therefore
    // impossible to target system daemons or unrelated processes from the UI.
    // It also only sends SIGTERM (graceful), never SIGKILL.
    if (!monitor.knows(input.pid)) {
      throw new Error(`Refusing to kill pid ${input.pid}: not a DevDeck-tracked dev server`)
    }
    try {
      process.kill(input.pid, 'SIGTERM')
    } catch {
      /* already gone or not permitted (e.g. not owned by this user) */
    }
    void monitor.refresh()
    return { ok: true as const }
  })

  handle('urls.open', async (input) => {
    if (/^https?:\/\//.test(input.url)) await shell.openExternal(input.url)
    return { ok: true as const }
  })

  // ─── Script runner ──────────────────────────────────────────────────────────
  handle('scripts.run', (input) => {
    const detail = projectRepo.get(input.projectId)
    if (!detail) throw new Error('Project not found')
    const script = detail.scripts.find((s) => s.name === input.scriptName)
    if (!script) throw new Error(`Script not found: ${input.scriptName}`)
    const sessionId = runner.run(input.projectId, detail.path, script)
    return { sessionId }
  })

  handle('scripts.stop', (input) => {
    runner.stop(input.sessionId)
    return { ok: true as const }
  })

  handle('scripts.sessions', () => runner.list())
  handle('scripts.output', (input) => ({ data: runner.output(input.sessionId) }))

  // ─── Poller (focus-aware) ────────────────────────────────────────────────────
  let timer: ReturnType<typeof setTimeout> | null = null
  const tick = () => {
    const win = getWindow()
    const visible = win?.isVisible() ?? false
    if (visible) void monitor.refresh()
    timer = setTimeout(tick, visible ? POLL_FOCUSED_MS : POLL_BLURRED_MS)
  }
  timer = setTimeout(tick, POLL_FOCUSED_MS)

  return () => {
    if (timer) clearTimeout(timer)
    runner.disposeAll()
  }
}
