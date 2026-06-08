import type { GitStatus, GitStatusLite } from '@shared/schemas/git'
import { getDb } from './connection'

interface GitRow {
  project_id: string
  is_repo: number
  branch: string | null
  upstream: string | null
  ahead: number
  behind: number
  staged: number
  modified: number
  untracked: number
  conflicted: number
  dirty: number
  remote_url: string | null
  last_commit_hash: string | null
  last_commit_msg: string | null
  last_commit_author: string | null
  last_commit_at: number | null
  health: string
  captured_at: number
}

function toStatus(r: GitRow): GitStatus {
  return {
    isRepo: r.is_repo === 1,
    branch: r.branch ?? undefined,
    upstream: r.upstream ?? undefined,
    ahead: r.ahead,
    behind: r.behind,
    staged: r.staged,
    modified: r.modified,
    untracked: r.untracked,
    conflicted: r.conflicted > 0,
    dirty: r.dirty === 1,
    remoteUrl: r.remote_url ?? undefined,
    lastCommit: r.last_commit_hash
      ? {
          hash: r.last_commit_hash,
          message: r.last_commit_msg ?? '',
          author: r.last_commit_author ?? '',
          at: r.last_commit_at ?? 0,
        }
      : undefined,
    health: r.health as GitStatus['health'],
    capturedAt: r.captured_at,
  }
}

export const gitRepo = {
  upsert(projectId: string, s: GitStatus): void {
    getDb()
      .prepare(
        `INSERT INTO git_status (
           project_id, is_repo, branch, upstream, ahead, behind, staged, modified,
           untracked, conflicted, dirty, remote_url, last_commit_hash, last_commit_msg,
           last_commit_author, last_commit_at, health, captured_at
         ) VALUES (
           @project_id, @is_repo, @branch, @upstream, @ahead, @behind, @staged, @modified,
           @untracked, @conflicted, @dirty, @remote_url, @hash, @msg, @author, @at, @health, @captured_at
         )
         ON CONFLICT(project_id) DO UPDATE SET
           is_repo=excluded.is_repo, branch=excluded.branch, upstream=excluded.upstream,
           ahead=excluded.ahead, behind=excluded.behind, staged=excluded.staged,
           modified=excluded.modified, untracked=excluded.untracked, conflicted=excluded.conflicted,
           dirty=excluded.dirty, remote_url=excluded.remote_url, last_commit_hash=excluded.last_commit_hash,
           last_commit_msg=excluded.last_commit_msg, last_commit_author=excluded.last_commit_author,
           last_commit_at=excluded.last_commit_at, health=excluded.health, captured_at=excluded.captured_at`,
      )
      .run({
        project_id: projectId,
        is_repo: s.isRepo ? 1 : 0,
        branch: s.branch ?? null,
        upstream: s.upstream ?? null,
        ahead: s.ahead,
        behind: s.behind,
        staged: s.staged,
        modified: s.modified,
        untracked: s.untracked,
        conflicted: s.conflicted ? 1 : 0,
        dirty: s.dirty ? 1 : 0,
        remote_url: s.remoteUrl ?? null,
        hash: s.lastCommit?.hash ?? null,
        msg: s.lastCommit?.message ?? null,
        author: s.lastCommit?.author ?? null,
        at: s.lastCommit?.at ?? null,
        health: s.health,
        captured_at: s.capturedAt,
      })
  },

  get(projectId: string): GitStatus | null {
    const row = getDb().prepare('SELECT * FROM git_status WHERE project_id = ?').get(projectId) as
      | GitRow
      | undefined
    return row ? toStatus(row) : null
  },

  /** Lite statuses for every repo, keyed by project id (for grid badges). */
  liteByProject(): Map<string, GitStatusLite> {
    const rows = getDb()
      .prepare('SELECT project_id, is_repo, branch, ahead, behind, dirty, conflicted, health FROM git_status WHERE is_repo = 1')
      .all() as Pick<
      GitRow,
      'project_id' | 'is_repo' | 'branch' | 'ahead' | 'behind' | 'dirty' | 'conflicted' | 'health'
    >[]
    const map = new Map<string, GitStatusLite>()
    for (const r of rows) {
      map.set(r.project_id, {
        isRepo: true,
        branch: r.branch ?? undefined,
        ahead: r.ahead,
        behind: r.behind,
        dirty: r.dirty === 1,
        conflicted: r.conflicted === 1,
        health: r.health as GitStatusLite['health'],
      })
    }
    return map
  },
}
