import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { HARD_IGNORE, isMarker, MONOREPO_MARKERS } from '@shared/constants/markers'

export interface Candidate {
  path: string
  /** Marker file names found in this directory. */
  markers: string[]
}

/**
 * Walks a scan root and yields project boundaries.
 *
 * The scan root is treated as a **container**: we descend into it to find the
 * projects inside, rather than treating the root itself as a project. This is
 * essential because a parent folder (e.g. `~/Projects`) may itself be a git repo
 * or otherwise contain a marker — that must not shadow the projects within it.
 *
 * Within the container, a directory containing any marker is a project, and the
 * walk does NOT descend into it (nested packages are sub-packages, not separate
 * projects) nor into any HARD_IGNORE / dotfile directory.
 *
 * Special cases for the root itself:
 *  - if the root is a monorepo (pnpm-workspace/turbo/etc.), it IS the single
 *    project — don't descend;
 *  - if descending finds nothing but the root has a marker, fall back to
 *    treating the root as a single project (so "add this one project folder"
 *    still works).
 */
export async function walkForProjects(
  root: string,
  maxDepth: number,
  onScan?: (dir: string) => void,
): Promise<Candidate[]> {
  const found: Candidate[] = []

  async function visit(dir: string, depth: number): Promise<void> {
    onScan?.(dir)
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return // unreadable (permissions, broken symlink) — skip
    }

    const markers = entries.map((e) => e.name).filter(isMarker)
    if (markers.length > 0) {
      found.push({ path: dir, markers })
      return // stop descending — this is a project boundary
    }

    if (depth >= maxDepth) return

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (HARD_IGNORE.has(entry.name) || entry.name.startsWith('.')) continue
      await visit(join(dir, entry.name), depth + 1)
    }
  }

  onScan?.(root)
  let rootEntries
  try {
    rootEntries = await readdir(root, { withFileTypes: true })
  } catch {
    return found
  }

  const rootNames = rootEntries.map((e) => e.name)
  const rootMarkers = rootNames.filter(isMarker)

  // A monorepo added directly as a root is one project — don't look inside.
  if (MONOREPO_MARKERS.some((m) => rootNames.includes(m))) {
    return [{ path: root, markers: rootMarkers }]
  }

  // Otherwise treat the root as a container: descend into its children.
  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue
    if (HARD_IGNORE.has(entry.name) || entry.name.startsWith('.')) continue
    await visit(join(root, entry.name), 1)
  }

  // Fallback: the root is itself a single project (e.g. the user added one
  // project folder directly) only if nothing was found inside it.
  if (found.length === 0 && rootMarkers.length > 0) {
    found.push({ path: root, markers: rootMarkers })
  }

  return found
}
