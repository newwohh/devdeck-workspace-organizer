import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { HARD_IGNORE, isMarker } from '@shared/constants/markers'

export interface Candidate {
  path: string
  /** Marker file names found in this directory. */
  markers: string[]
}

/**
 * Walks a scan root and yields project boundaries. A directory containing any
 * marker file is a project; the walk does NOT descend into a project (nested
 * packages are handled as sub-packages, not separate projects) nor into any
 * HARD_IGNORE directory. `onScan` fires per directory examined (for progress).
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

  await visit(root, 0)
  return found
}
