import { dialog, shell, type BrowserWindow } from 'electron'
import { spawn } from 'node:child_process'
import { newId } from '../../db/ids'
import { projectRepo } from '../../db/project-repo'
import { scanRootRepo } from '../../db/scan-root-repo'
import { refreshGitFor } from '../../engines/git/refresh'
import { rescanRoot, type IndexEvents } from '../../engines/indexer/service'
import type { ScanRoot } from '@shared/schemas/project'
import { handle } from '../router'

/** Registers scan-root, indexing, and project IPC handlers. */
export function registerProjectHandlers(getWindow: () => BrowserWindow | null): void {
  const events: IndexEvents = {
    progress: (p) => getWindow()?.webContents.send('events.scan.progress', p),
    changed: (rootId) => getWindow()?.webContents.send('events.projects.changed', { rootId }),
  }
  const emitGitChanged = () => getWindow()?.webContents.send('events.git.changed', {})

  // Index a root, then refresh git for its projects, re-broadcasting so the
  // grid picks up git badges once they're computed.
  async function scanAndGit(root: ScanRoot): Promise<void> {
    await rescanRoot(root, events)
    const { items } = scanRootGit(root.id)
    await refreshGitFor(items, emitGitChanged)
    emitGitChanged()
    events.changed(root.id)
  }

  function scanRootGit(rootId: string): { items: { id: string; path: string }[] } {
    const { items } = projectRepo.list({ rootId })
    return { items: items.map((p) => ({ id: p.id, path: p.path })) }
  }

  // ─── Scan roots ─────────────────────────────────────────────────────────────
  handle('roots.list', () => scanRootRepo.list())

  handle('roots.pick', async (_input, ctx) => {
    const result = await dialog.showOpenDialog(ctx.window ?? undefined!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose a folder to scan for projects',
    })
    return { path: result.canceled ? null : (result.filePaths[0] ?? null) }
  })

  handle('roots.add', async (input) => {
    const root = scanRootRepo.add(input.path)
    // Kick off an initial scan + git refresh in the background.
    void scanAndGit(root)
    return scanRootRepo.getByPath(root.path) ?? root
  })

  handle('roots.remove', (input) => {
    scanRootRepo.remove(input.id)
    events.changed(undefined as unknown as string)
    return { ok: true as const }
  })

  // ─── Indexing ───────────────────────────────────────────────────────────────
  handle('index.rescan', (input) => {
    const jobId = newId('job')
    const roots = input.rootId
      ? scanRootRepo.list().filter((r) => r.id === input.rootId)
      : scanRootRepo.list()
    void (async () => {
      for (const root of roots) await scanAndGit(root)
    })()
    return { jobId }
  })

  // ─── Projects ───────────────────────────────────────────────────────────────
  handle('projects.list', (filter) => projectRepo.list(filter))
  handle('projects.get', (input) => projectRepo.get(input.id))
  handle('projects.toggleFavorite', (input) => projectRepo.toggleFavorite(input.id))
  handle('projects.setCategory', (input) => projectRepo.setCategory(input.id, input.category))

  handle('projects.open', async (input) => {
    const path = projectRepo.pathFor(input.id)
    if (!path) throw new Error('Project not found')
    if (input.target === 'finder') {
      shell.openPath(path)
    } else if (input.target === 'editor') {
      // Phase 1: default to VS Code's `code` CLI; per-project editors land next.
      spawn('code', [path], { shell: false, detached: true, stdio: 'ignore' }).unref()
    } else if (input.target === 'terminal') {
      spawn('open', ['-a', 'Terminal', path], { shell: false, detached: true, stdio: 'ignore' }).unref()
    }
    projectRepo.markOpened(input.id)
    return { ok: true as const }
  })
}
