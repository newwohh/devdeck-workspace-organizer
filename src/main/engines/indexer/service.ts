import type { ScanRoot } from '@shared/schemas/project'
import { newId } from '../../db/ids'
import { projectRepo } from '../../db/project-repo'
import { analyzeProject } from './analyze'
import { walkForProjects } from './walk'

export interface IndexEvents {
  progress(p: {
    jobId: string
    rootId: string
    scanned: number
    found: number
    done: boolean
    currentPath?: string
  }): void
  changed(rootId: string): void
}

const ANALYZE_CONCURRENCY = 8

/** Walks a root, analyzes every discovered project, upserts, and prunes stale
 * rows. Emits progress throughout and a `changed` event when finished. */
export async function rescanRoot(root: ScanRoot, events: IndexEvents): Promise<number> {
  const jobId = newId('job')
  let scanned = 0

  const allCandidates = await walkForProjects(root.path, root.maxDepth, (dir) => {
    scanned++
    if (scanned % 20 === 0) {
      events.progress({ jobId, rootId: root.id, scanned, found: 0, done: false, currentPath: dir })
    }
  })

  // Skip paths the user explicitly removed.
  const ignored = projectRepo.ignoredPaths()
  const candidates = allCandidates.filter((c) => !ignored.has(c.path))

  const keepPaths: string[] = []
  let found = 0
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < candidates.length) {
      const candidate = candidates[cursor++]
      try {
        const discovered = await analyzeProject(candidate.path, candidate.markers)
        projectRepo.upsert(root.id, discovered)
        keepPaths.push(candidate.path)
      } catch (err) {
        console.error(`[indexer] failed to analyze ${candidate.path}:`, err)
      }
      found++
      if (found % 10 === 0 || found === candidates.length) {
        events.progress({
          jobId,
          rootId: root.id,
          scanned,
          found,
          done: false,
          currentPath: candidate.path,
        })
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(ANALYZE_CONCURRENCY, candidates.length || 1) }, worker),
  )

  projectRepo.pruneRoot(root.id, keepPaths)

  events.progress({ jobId, rootId: root.id, scanned, found, done: true })
  events.changed(root.id)
  return found
}
