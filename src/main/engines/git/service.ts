import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { GitStatus } from '@shared/schemas/git'
import { deriveHealth, parsePorcelainV2 } from './parse'

const execFileAsync = promisify(execFile)

/** Runs git in a repo with arg arrays (never a shell string). Returns stdout,
 * or null on failure (not a repo, git missing, etc.). */
async function git(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
      timeout: 8000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    })
    return stdout
  } catch {
    return null
  }
}

const NOT_A_REPO: GitStatus = {
  isRepo: false,
  ahead: 0,
  behind: 0,
  dirty: false,
  conflicted: false,
  staged: 0,
  modified: 0,
  untracked: 0,
  health: 'unknown',
  capturedAt: 0,
}

/** Reads full git status for a working tree. */
export async function readGitStatus(path: string): Promise<GitStatus> {
  const statusOut = await git(path, ['status', '--porcelain=v2', '--branch'])
  if (statusOut === null) return { ...NOT_A_REPO, capturedAt: Date.now() }

  const parsed = parsePorcelainV2(statusOut)
  const dirty = parsed.staged + parsed.modified + parsed.untracked + parsed.conflicted > 0

  // Each field is single-line, so newline-delimited output parses cleanly.
  const [logOut, remoteOut] = await Promise.all([
    git(path, ['log', '-1', '--format=%H%n%s%n%an%n%ct']),
    git(path, ['remote', 'get-url', 'origin']),
  ])

  let lastCommit: GitStatus['lastCommit']
  if (logOut) {
    const [hash, message, author, ct] = logOut.split('\n')
    if (hash) {
      lastCommit = { hash, message: message ?? '', author: author ?? '', at: Number(ct) * 1000 }
    }
  }

  return {
    isRepo: true,
    branch: parsed.branch,
    upstream: parsed.upstream,
    ahead: parsed.ahead,
    behind: parsed.behind,
    staged: parsed.staged,
    modified: parsed.modified,
    untracked: parsed.untracked,
    conflicted: parsed.conflicted > 0,
    dirty,
    remoteUrl: remoteOut?.trim() || undefined,
    lastCommit,
    health: deriveHealth(parsed),
    capturedAt: Date.now(),
  }
}

/** Probes whether git is available on the system. */
export async function gitAvailable(): Promise<boolean> {
  return (await git(process.cwd(), ['--version'])) !== null
}
