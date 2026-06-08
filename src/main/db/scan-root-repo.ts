import type { ScanRoot } from '@shared/schemas/project'
import { getDb } from './connection'
import { newId } from './ids'

interface ScanRootRow {
  id: string
  path: string
  enabled: number
  max_depth: number
  created_at: number
  project_count: number
}

function toScanRoot(r: ScanRootRow): ScanRoot {
  return {
    id: r.id,
    path: r.path,
    enabled: r.enabled === 1,
    maxDepth: r.max_depth,
    createdAt: r.created_at,
    projectCount: r.project_count,
  }
}

export const scanRootRepo = {
  list(): ScanRoot[] {
    const rows = getDb()
      .prepare(
        `SELECT r.*, (SELECT COUNT(*) FROM project p WHERE p.root_id = r.id) AS project_count
         FROM scan_root r ORDER BY r.created_at ASC`,
      )
      .all() as ScanRootRow[]
    return rows.map(toScanRoot)
  },

  getByPath(path: string): ScanRoot | undefined {
    const row = getDb().prepare('SELECT * FROM scan_root WHERE path = ?').get(path) as
      | Omit<ScanRootRow, 'project_count'>
      | undefined
    return row ? toScanRoot({ ...row, project_count: 0 }) : undefined
  },

  add(path: string, maxDepth = 6): ScanRoot {
    const existing = this.getByPath(path)
    if (existing) return existing
    const id = newId('root')
    const createdAt = Date.now()
    getDb()
      .prepare(
        `INSERT INTO scan_root (id, path, enabled, max_depth, created_at)
         VALUES (?, ?, 1, ?, ?)`,
      )
      .run(id, path, maxDepth, createdAt)
    return { id, path, enabled: true, maxDepth, createdAt, projectCount: 0 }
  },

  remove(id: string): void {
    getDb().prepare('DELETE FROM scan_root WHERE id = ?').run(id)
  },
}
