import type { GitRepoRow } from '@shared/schemas/git'
import { gitRepo } from '../../db/git-repo'
import { projectRepo } from '../../db/project-repo'
import { readGitStatus } from './service'

const CONCURRENCY = 8

/** Refreshes git status for a set of projects, persisting each result. Returns
 * the number of actual repos found. Bounded concurrency keeps it responsive. */
export async function refreshGitFor(
  projects: { id: string; path: string }[],
  onBatch?: () => void,
): Promise<number> {
  let cursor = 0
  let repos = 0

  async function worker(): Promise<void> {
    while (cursor < projects.length) {
      const p = projects[cursor++]
      const status = await readGitStatus(p.path)
      gitRepo.upsert(p.id, status)
      if (status.isRepo) repos++
      if (cursor % 10 === 0) onBatch?.()
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, projects.length || 1) }, worker))
  onBatch?.()
  return repos
}

/** Builds the multi-repo status rows (cached), repos only, worst-health first. */
export function gitStatusAll(): GitRepoRow[] {
  const { items } = projectRepo.list({})
  const rows: GitRepoRow[] = []
  for (const p of items) {
    const full = gitRepo.get(p.id)
    if (full?.isRepo) rows.push({ projectId: p.id, name: p.name, path: p.path, git: full })
  }
  const order: Record<string, number> = { conflicted: 0, behind: 1, dirty: 2, detached: 3, clean: 4, unknown: 5 }
  return rows.sort((a, b) => (order[a.git.health] ?? 9) - (order[b.git.health] ?? 9))
}
