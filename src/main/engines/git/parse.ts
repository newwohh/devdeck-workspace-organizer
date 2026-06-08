import type { GitHealth } from '@shared/schemas/git'

export interface ParsedStatus {
  branch?: string
  upstream?: string
  detached: boolean
  ahead: number
  behind: number
  staged: number
  modified: number
  untracked: number
  conflicted: number
}

/**
 * Parses `git status --porcelain=v2 --branch` output. Pure function — the
 * engine's testable core.
 *
 * Format reference (porcelain v2):
 *   # branch.head <name>          ('(detached)' when not on a branch)
 *   # branch.upstream <name>
 *   # branch.ab +<ahead> -<behind>
 *   1 <XY> ... <path>             ordinary changed entry
 *   2 <XY> ... <path>\t<orig>     renamed/copied entry
 *   u <XY> ... <path>             unmerged (conflict) entry
 *   ? <path>                      untracked
 *   ! <path>                      ignored
 *
 * In <XY>, X is the staged (index) state and Y the worktree state; '.' means
 * unmodified in that column.
 */
export function parsePorcelainV2(output: string): ParsedStatus {
  const s: ParsedStatus = {
    detached: false,
    ahead: 0,
    behind: 0,
    staged: 0,
    modified: 0,
    untracked: 0,
    conflicted: 0,
  }

  for (const line of output.split('\n')) {
    if (line === '') continue

    if (line.startsWith('# branch.head ')) {
      const head = line.slice('# branch.head '.length).trim()
      if (head === '(detached)') s.detached = true
      else s.branch = head
    } else if (line.startsWith('# branch.upstream ')) {
      s.upstream = line.slice('# branch.upstream '.length).trim()
    } else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+)\s+-(\d+)/)
      if (m) {
        s.ahead = Number(m[1])
        s.behind = Number(m[2])
      }
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const xy = line.split(' ')[1] ?? '..'
      if (xy[0] !== '.') s.staged++
      if (xy[1] !== '.') s.modified++
    } else if (line.startsWith('u ')) {
      s.conflicted++
    } else if (line.startsWith('? ')) {
      s.untracked++
    }
  }

  return s
}

/** Derives the headline health from a parsed status. */
export function deriveHealth(s: ParsedStatus): GitHealth {
  if (s.conflicted > 0) return 'conflicted'
  if (s.detached) return 'detached'
  if (s.behind > 0) return 'behind'
  if (s.staged + s.modified + s.untracked > 0) return 'dirty'
  return 'clean'
}
