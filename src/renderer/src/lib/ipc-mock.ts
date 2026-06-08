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

const sampleProjects: ProjectSummary[] = [
  mk({ id: 'p1', name: 'acme-storefront', type: 'app', frameworks: ['Next.js', 'React'], category: 'Client', favorite: true, fsModifiedAt: Date.now() - 3_600_000 }),
  mk({ id: 'p2', name: 'acme-api', type: 'service', frameworks: ['NestJS'], category: 'Client', fsModifiedAt: Date.now() - 7_200_000 }),
  mk({ id: 'p3', name: 'shopify-loyalty-app', type: 'app', frameworks: ['Shopify App', 'Remix'], category: 'Work', fsModifiedAt: Date.now() - 172_800_000 }),
  mk({ id: 'p4', name: 'analytics-worker', type: 'service', primaryLanguage: 'go', packageManager: 'go', frameworks: [], fsModifiedAt: Date.now() - 600_000 }),
  mk({ id: 'p5', name: 'design-system', type: 'library', frameworks: [], category: 'Open Source', fsModifiedAt: Date.now() - 1_209_600_000 }),
  mk({ id: 'p6', name: 'rust-cli-tool', type: 'cli', primaryLanguage: 'rust', packageManager: 'cargo', frameworks: [], category: 'Personal', fsModifiedAt: Date.now() - 432_000_000 }),
]

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
