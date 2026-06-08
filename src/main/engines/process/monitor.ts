import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ProcessInfo } from '@shared/schemas/runtime'
import { getDb } from '../../db/connection'
import { deriveProcessName, parseListeners } from './lsof'

const execFileAsync = promisify(execFile)

async function run(cmd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: 6000, maxBuffer: 8 * 1024 * 1024 })
    return stdout
  } catch {
    return null
  }
}

interface PsRow {
  cpu: number
  rss: number
  command: string
}

/**
 * Detects running dev servers via their listening TCP ports, enriches them with
 * process metadata, and attributes each to a project by working directory.
 * Holds the last result so the IPC read is cheap; the poller refreshes it.
 */
export class ProcessMonitor {
  private latest: ProcessInfo[] = []
  private lastHash = ''

  constructor(private onChange: () => void) {}

  current(): ProcessInfo[] {
    return this.latest
  }

  /** Whether `pid` is one of the dev servers DevDeck currently tracks. Used to
   * ensure the app can never signal an untracked (e.g. system) process. */
  knows(pid: number): boolean {
    return this.latest.some((p) => p.pid === pid)
  }

  async refresh(): Promise<ProcessInfo[]> {
    const lsofOut = await run('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-F', 'pn'])
    if (lsofOut === null) {
      this.commit([])
      return this.latest
    }

    const listeners = parseListeners(lsofOut)
    if (listeners.length === 0) {
      this.commit([])
      return this.latest
    }

    const pids = [...new Set(listeners.map((l) => l.pid))]
    const [psRows, cwds] = await Promise.all([this.psMeta(pids), this.cwdFor(pids)])
    const projects = this.projectPaths()

    const result: ProcessInfo[] = []
    for (const { pid, port } of listeners) {
      const meta = psRows.get(pid)
      if (!meta) continue
      const owner = attribute(cwds.get(pid), meta.command, projects)
      result.push({
        pid,
        name: deriveProcessName(meta.command),
        command: meta.command,
        cpu: meta.cpu,
        memoryBytes: meta.rss * 1024,
        port,
        url: `http://localhost:${port}`,
        projectId: owner?.id ?? null,
        projectName: owner?.name,
      })
    }

    result.sort((a, b) => (a.port ?? 0) - (b.port ?? 0))
    this.commit(result)
    return this.latest
  }

  private commit(list: ProcessInfo[]): void {
    const hash = JSON.stringify(list.map((p) => [p.pid, p.port, p.cpu | 0, p.projectId]))
    this.latest = list
    if (hash !== this.lastHash) {
      this.lastHash = hash
      this.onChange()
    }
  }

  private async psMeta(pids: number[]): Promise<Map<number, PsRow>> {
    const out = await run('ps', ['-o', 'pid=,%cpu=,rss=,command=', '-p', pids.join(',')])
    const map = new Map<number, PsRow>()
    if (!out) return map
    for (const line of out.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const m = trimmed.match(/^(\d+)\s+([\d.]+)\s+(\d+)\s+(.*)$/)
      if (!m) continue
      map.set(Number(m[1]), { cpu: Number(m[2]), rss: Number(m[3]), command: m[4] })
    }
    return map
  }

  private async cwdFor(pids: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>()
    await Promise.all(
      pids.map(async (pid) => {
        const out = await run('lsof', ['-a', '-d', 'cwd', '-p', String(pid), '-F', 'n'])
        const line = out?.split('\n').find((l) => l.startsWith('n'))
        if (line) map.set(pid, line.slice(1))
      }),
    )
    return map
  }

  private projectPaths(): { id: string; name: string; path: string }[] {
    return getDb().prepare('SELECT id, name, path FROM project WHERE archived = 0').all() as {
      id: string
      name: string
      path: string
    }[]
  }
}

/** Attributes a process to a project by cwd containment (longest match wins),
 * falling back to a path mentioned in the command line. */
function attribute(
  cwd: string | undefined,
  command: string,
  projects: { id: string; name: string; path: string }[],
): { id: string; name: string } | undefined {
  let best: { id: string; name: string; path: string } | undefined
  if (cwd) {
    for (const p of projects) {
      if (cwd === p.path || cwd.startsWith(p.path + '/')) {
        if (!best || p.path.length > best.path.length) best = p
      }
    }
  }
  if (!best) {
    for (const p of projects) {
      if (command.includes(p.path)) {
        if (!best || p.path.length > best.path.length) best = p
      }
    }
  }
  return best ? { id: best.id, name: best.name } : undefined
}
