import type { BrowserWindow } from 'electron'
import { gitRepo } from '../../db/git-repo'
import { newId } from '../../db/ids'
import { projectRepo } from '../../db/project-repo'
import { gitStatusAll, refreshGitFor } from '../../engines/git/refresh'
import { gitAvailable, readGitStatus } from '../../engines/git/service'
import { handle } from '../router'

/** Registers git read handlers. Refresh runs in the background and emits a
 * change event so the UI (cards + git view) updates live. */
export function registerGitHandlers(getWindow: () => BrowserWindow | null): void {
  const emitChanged = () => getWindow()?.webContents.send('events.git.changed', {})

  handle('git.available', async () => ({ ok: await gitAvailable() }))

  handle('git.status', async (input) => {
    // Serve cache if fresh-ish; otherwise read live and persist.
    const cached = gitRepo.get(input.projectId)
    if (cached) return cached
    const path = projectRepo.pathFor(input.projectId)
    if (!path) return null
    const status = await readGitStatus(path)
    gitRepo.upsert(input.projectId, status)
    return status
  })

  handle('git.statusAll', () => gitStatusAll())

  handle('git.refresh', (input) => {
    const jobId = newId('gitjob')
    const { items } = projectRepo.list(input.rootId ? { rootId: input.rootId } : {})
    void refreshGitFor(
      items.map((p) => ({ id: p.id, path: p.path })),
      emitChanged,
    )
    return { jobId }
  })
}
