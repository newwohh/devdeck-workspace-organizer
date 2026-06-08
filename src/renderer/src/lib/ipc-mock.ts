import type { GitStatus, GitStatusLite } from '@shared/schemas/git'
import type { ProjectDetail, ProjectSummary, ScanRoot } from '@shared/schemas/project'
import type { DevDeckBridge } from '@shared/ipc/api'

/**
 * Browser-preview shim for the Electron preload bridge.
 *
 * Inside Electron the real `window.devdeck` is always present and this is never
 * used. It only activates when the renderer is served as a plain web page (e.g.
 * Claude Code's preview panel) so the UI can render with representative sample
 * data. NOT wired to SQLite or any real engine.
 */
const store = new Map<string, unknown>()
const listeners = new Map<string, Set<(payload: any) => void>>()

function emit(channel: string, payload: unknown): void {
  listeners.get(channel)?.forEach((cb) => cb(payload))
}

const sampleRoot: ScanRoot = {
  id: 'root_demo',
  path: '/Users/dev/Projects',
  enabled: true,
  maxDepth: 6,
  createdAt: Date.now() - 86_400_000,
  projectCount: 6,
}

const mk = (p: Partial<ProjectSummary> & Pick<ProjectSummary, 'id' | 'name' | 'type'>): ProjectSummary => ({
  rootId: 'root_demo',
  path: `/Users/dev/Projects/${p.name}`,
  primaryLanguage: 'typescript',
  packageManager: 'pnpm',
  isMonorepo: false,
  category: null,
  health: 'ok',
  favorite: false,
  frameworks: [],
  tags: [],
  ...p,
})

const lite = (p: Partial<GitStatusLite>): GitStatusLite => ({
  isRepo: true,
  branch: 'main',
  ahead: 0,
  behind: 0,
  dirty: false,
  conflicted: false,
  health: 'clean',
  ...p,
})

let sampleProjects: ProjectSummary[] = [
  mk({ id: 'p1', name: 'acme-storefront', type: 'app', frameworks: ['Next.js', 'React'], category: 'Client', favorite: true, fsModifiedAt: Date.now() - 3_600_000, git: lite({ branch: 'feat/checkout', dirty: true, ahead: 2, health: 'dirty' }) }),
  mk({ id: 'p2', name: 'acme-api', type: 'service', frameworks: ['NestJS'], category: 'Client', fsModifiedAt: Date.now() - 7_200_000, git: lite({ branch: 'main', behind: 3, health: 'behind' }) }),
  mk({ id: 'p3', name: 'shopify-loyalty-app', type: 'app', frameworks: ['Shopify App', 'Remix'], category: 'Work', fsModifiedAt: Date.now() - 172_800_000, git: lite({ branch: 'develop', conflicted: true, dirty: true, health: 'conflicted' }) }),
  mk({ id: 'p4', name: 'analytics-worker', type: 'service', primaryLanguage: 'go', packageManager: 'go', frameworks: [], fsModifiedAt: Date.now() - 600_000, git: lite({ branch: 'main', health: 'clean' }) }),
  mk({ id: 'p5', name: 'design-system', type: 'library', frameworks: [], category: 'Open Source', fsModifiedAt: Date.now() - 1_209_600_000, git: lite({ branch: 'main', dirty: true, health: 'dirty' }) }),
  mk({ id: 'p6', name: 'rust-cli-tool', type: 'cli', primaryLanguage: 'rust', packageManager: 'cargo', frameworks: [], category: 'Personal', fsModifiedAt: Date.now() - 432_000_000, git: lite({ branch: 'main', health: 'clean' }) }),
]

interface MockSession {
  id: string
  projectId: string
  name: string
  buffer: string
  running: boolean
  timers: ReturnType<typeof setTimeout>[]
}
const mockSessions = new Map<string, MockSession>()
let mockSeq = 0

function startMockRun(input: { projectId: string; scriptName: string }): { sessionId: string } {
  const id = `sess_mock_${++mockSeq}`
  const session: MockSession = { id, projectId: input.projectId, name: input.scriptName, buffer: '', running: true, timers: [] }
  mockSessions.set(id, session)

  const push = (data: string) => {
    session.buffer += data
    emit('events.terminal.data', { sessionId: id, data, stream: 'stdout' })
  }
  const lines = [
    `$ pnpm run ${input.scriptName}\n`,
    '> building...\n',
    'VITE v5.4.0  ready in 312 ms\n',
    '➜  Local:   http://localhost:3000/\n',
    '✓ compiled successfully\n',
  ]
  lines.forEach((l, i) => {
    session.timers.push(setTimeout(() => session.running && push(l), 250 * (i + 1)))
  })
  return { sessionId: id }
}

function stopMockRun(sessionId: string): void {
  const s = mockSessions.get(sessionId)
  if (!s) return
  s.timers.forEach(clearTimeout)
  s.running = false
  s.buffer += '\n[stopped]\n'
  emit('events.terminal.exit', { sessionId, code: 0 })
}

function toFullGit(p: ProjectSummary): GitStatus {
  const g = p.git!
  const changes = g.dirty ? 4 : 0
  return {
    ...g,
    upstream: g.branch ? `origin/${g.branch}` : undefined,
    staged: g.dirty ? 1 : 0,
    modified: changes,
    untracked: g.dirty ? 2 : 0,
    remoteUrl: `git@github.com:acme/${p.name}.git`,
    lastCommit: { hash: 'a1b2c3d', message: `chore: update ${p.name}`, author: 'dev', at: Date.now() - 3_600_000 },
    capturedAt: Date.now(),
  }
}

export const browserMockBridge: DevDeckBridge = {
  async invoke(channel, input): Promise<any> {
    switch (channel) {
      case 'system.appInfo':
        return { name: 'DevDeck', version: '0.0.1', electron: 'web-preview', node: 'web-preview', chrome: 'web-preview', platform: 'web' }
      case 'system.ping':
        return { reply: `pong: ${(input as { message: string }).message}`, pid: 0, ts: Date.now() }
      case 'settings.get':
        return { key: (input as { key: string }).key, value: store.get((input as { key: string }).key) ?? null }
      case 'settings.set': {
        const { key, value } = input as { key: string; value: unknown }
        store.set(key, value)
        emit('events.settings.changed', { key, value })
        return { ok: true }
      }
      case 'roots.list':
        return [sampleRoot]
      case 'roots.pick':
        return { path: '/Users/dev/Projects' }
      case 'roots.add':
        return sampleRoot
      case 'roots.remove':
        return { ok: true }
      case 'index.rescan':
        return { jobId: 'job_demo' }
      case 'projects.list': {
        const f = input as { text?: string; types?: string[] }
        let items = sampleProjects
        if (f.text) items = items.filter((p) => p.name.toLowerCase().includes(f.text!.toLowerCase()))
        if (f.types?.length) items = items.filter((p) => f.types!.includes(p.type))
        return { items, total: items.length }
      }
      case 'projects.get': {
        const id = (input as { id: string }).id
        const s = sampleProjects.find((p) => p.id === id)
        if (!s) return null
        const detail: ProjectDetail = {
          ...s,
          stack: s.frameworks.map((name) => ({ layer: 'frontend' as const, name, confidence: 1 })),
          scripts: [
            { name: 'dev', command: 'next dev', runner: 'pnpm', kind: 'dev' },
            { name: 'build', command: 'next build', runner: 'pnpm', kind: 'build' },
            { name: 'test', command: 'vitest', runner: 'pnpm', kind: 'test' },
          ],
          packages: [],
          firstSeenAt: Date.now() - 86_400_000,
          lastIndexedAt: Date.now(),
        }
        return detail
      }
      case 'projects.toggleFavorite':
      case 'projects.setCategory':
        return sampleProjects.find((p) => p.id === (input as { id: string }).id) ?? sampleProjects[0]
      case 'projects.open':
        return { ok: true }
      case 'git.available':
        return { ok: true }
      case 'git.status': {
        const p = sampleProjects.find((x) => x.id === (input as { projectId: string }).projectId)
        if (!p?.git) return null
        return toFullGit(p)
      }
      case 'git.statusAll':
        return sampleProjects
          .filter((p) => p.git?.isRepo)
          .map((p) => ({ projectId: p.id, name: p.name, path: p.path, git: toFullGit(p) }))
      case 'git.refresh':
        return { jobId: 'gitjob_demo' }
      case 'process.list':
        return [
          { pid: 4123, name: 'Next.js', command: 'node next dev', cpu: 2.4, memoryBytes: 320 * 1024 * 1024, port: 3000, url: 'http://localhost:3000', projectId: 'p1', projectName: 'acme-storefront' },
          { pid: 4290, name: 'Vite', command: 'node vite', cpu: 1.1, memoryBytes: 180 * 1024 * 1024, port: 5173, url: 'http://localhost:5173', projectId: 'p5', projectName: 'design-system' },
          { pid: 4455, name: 'Go', command: 'analytics-worker serve', cpu: 0.3, memoryBytes: 42 * 1024 * 1024, port: 8080, url: 'http://localhost:8080', projectId: 'p4', projectName: 'analytics-worker' },
        ]
      case 'process.kill':
      case 'urls.open':
        return { ok: true }
      case 'scripts.run':
        return startMockRun(input as { projectId: string; scriptName: string })
      case 'scripts.stop':
        stopMockRun((input as { sessionId: string }).sessionId)
        return { ok: true }
      case 'scripts.sessions':
        return [...mockSessions.values()].map((s) => ({ sessionId: s.id, projectId: s.projectId, scriptName: s.name, running: s.running, exitCode: s.running ? null : 0 }))
      case 'scripts.output':
        return { data: mockSessions.get((input as { sessionId: string }).sessionId)?.buffer ?? '' }
      case 'projects.remove': {
        const id = (input as { id: string }).id
        sampleProjects = sampleProjects.filter((p) => p.id !== id)
        emit('events.projects.changed', {})
        return { ok: true }
      }
      default:
        throw new Error(`browserMockBridge: unhandled channel "${channel}"`)
    }
  },

  on(channel, listener): () => void {
    const set = listeners.get(channel) ?? new Set()
    set.add(listener as (p: any) => void)
    listeners.set(channel, set)
    return () => set.delete(listener as (p: any) => void)
  },
}
