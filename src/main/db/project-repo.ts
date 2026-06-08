import type {
  ProjectDetail,
  ProjectFilter,
  ProjectScript,
  ProjectSummary,
  ProjectType,
  StackItem,
} from '@shared/schemas/project'
import type { DiscoveredProject } from '../engines/indexer/types'
import { getDb } from './connection'
import { gitRepo } from './git-repo'
import { projectIdForPath } from './ids'

interface ProjectRow {
  id: string
  root_id: string
  path: string
  name: string
  type: string
  primary_language: string | null
  package_manager: string | null
  is_monorepo: number
  category: string | null
  health: string
  favorite: number
  description: string | null
  readme_path: string | null
  size_bytes: number | null
  fs_modified_at: number | null
  last_opened_at: number | null
  first_seen_at: number
  last_indexed_at: number
}

function frameworksFor(id: string): string[] {
  const rows = getDb()
    .prepare(
      `SELECT name FROM project_stack WHERE project_id = ? AND layer IN ('frontend','backend')
       ORDER BY confidence DESC`,
    )
    .all(id) as { name: string }[]
  return rows.map((r) => r.name)
}

function tagsFor(id: string): string[] {
  const rows = getDb()
    .prepare(
      `SELECT t.name FROM tag t JOIN project_tag pt ON pt.tag_id = t.id WHERE pt.project_id = ?`,
    )
    .all(id) as { name: string }[]
  return rows.map((r) => r.name)
}

function toSummary(r: ProjectRow): ProjectSummary {
  return {
    id: r.id,
    rootId: r.root_id,
    name: r.name,
    path: r.path,
    type: r.type as ProjectType,
    primaryLanguage: r.primary_language ?? undefined,
    packageManager: r.package_manager ?? undefined,
    isMonorepo: r.is_monorepo === 1,
    category: r.category,
    health: r.health as ProjectSummary['health'],
    favorite: r.favorite === 1,
    frameworks: frameworksFor(r.id),
    tags: tagsFor(r.id),
    description: r.description ?? undefined,
    fsModifiedAt: r.fs_modified_at ?? undefined,
    lastOpenedAt: r.last_opened_at ?? undefined,
  }
}

const SORT_COLUMNS: Record<string, string> = {
  name: 'name COLLATE NOCASE',
  modified: 'fs_modified_at',
  opened: 'last_opened_at',
  type: 'type',
}

export const projectRepo = {
  /** Inserts or updates a discovered project, preserving user metadata. */
  upsert(rootId: string, p: DiscoveredProject): string {
    const db = getDb()
    const id = projectIdForPath(p.path)
    const now = Date.now()

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO project (
           id, root_id, path, name, type, primary_language, package_manager,
           is_monorepo, description, readme_path, size_bytes, fs_modified_at,
           first_seen_at, last_indexed_at, index_hash
         ) VALUES (
           @id, @root_id, @path, @name, @type, @primary_language, @package_manager,
           @is_monorepo, @description, @readme_path, @size_bytes, @fs_modified_at,
           @now, @now, @index_hash
         )
         ON CONFLICT(id) DO UPDATE SET
           root_id = excluded.root_id,
           name = excluded.name,
           type = excluded.type,
           primary_language = excluded.primary_language,
           package_manager = excluded.package_manager,
           is_monorepo = excluded.is_monorepo,
           description = excluded.description,
           readme_path = excluded.readme_path,
           size_bytes = excluded.size_bytes,
           fs_modified_at = excluded.fs_modified_at,
           last_indexed_at = excluded.last_indexed_at,
           index_hash = excluded.index_hash`,
      ).run({
        id,
        root_id: rootId,
        path: p.path,
        name: p.name,
        type: p.type,
        primary_language: p.primaryLanguage ?? null,
        package_manager: p.packageManager ?? null,
        is_monorepo: p.isMonorepo ? 1 : 0,
        description: p.description ?? null,
        readme_path: p.readmePath ?? null,
        size_bytes: p.sizeBytes ?? null,
        fs_modified_at: p.fsModifiedAt ?? null,
        index_hash: p.indexHash,
        now,
      })

      // Replace derived child rows (stack, scripts, packages) wholesale.
      db.prepare('DELETE FROM project_stack WHERE project_id = ?').run(id)
      const insStack = db.prepare(
        `INSERT INTO project_stack (project_id, layer, name, version, confidence, source)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      for (const s of p.stack) insStack.run(id, s.layer, s.name, s.version ?? null, s.confidence, s.source ?? null)

      db.prepare('DELETE FROM project_script WHERE project_id = ?').run(id)
      const insScript = db.prepare(
        `INSERT OR IGNORE INTO project_script (project_id, name, command, runner, kind)
         VALUES (?, ?, ?, ?, ?)`,
      )
      for (const s of p.scripts) insScript.run(id, s.name, s.command, s.runner, s.kind ?? null)

      db.prepare('DELETE FROM project_package WHERE project_id = ?').run(id)
      const insPkg = db.prepare(
        `INSERT OR IGNORE INTO project_package (project_id, rel_path, name, primary_language)
         VALUES (?, ?, ?, ?)`,
      )
      for (const pk of p.packages) insPkg.run(id, pk.relPath, pk.name, pk.primaryLanguage ?? null)
    })
    tx()
    return id
  },

  /** Deletes projects under a root whose path is not in `keepPaths` (pruning). */
  pruneRoot(rootId: string, keepPaths: string[]): number {
    const db = getDb()
    const existing = db.prepare('SELECT id, path FROM project WHERE root_id = ?').all(rootId) as {
      id: string
      path: string
    }[]
    const keep = new Set(keepPaths)
    const del = db.prepare('DELETE FROM project WHERE id = ?')
    let removed = 0
    for (const row of existing) {
      if (!keep.has(row.path)) {
        del.run(row.id)
        removed++
      }
    }
    return removed
  },

  list(filter: ProjectFilter): { items: ProjectSummary[]; total: number } {
    const where: string[] = ['archived = 0']
    const params: Record<string, unknown> = {}

    if (filter.rootId) {
      where.push('root_id = @rootId')
      params.rootId = filter.rootId
    }
    if (filter.text) {
      where.push('(name LIKE @text OR path LIKE @text)')
      params.text = `%${filter.text}%`
    }
    if (filter.types?.length) {
      where.push(`type IN (${filter.types.map((_, i) => `@t${i}`).join(',')})`)
      filter.types.forEach((t, i) => (params[`t${i}`] = t))
    }
    if (filter.languages?.length) {
      where.push(`primary_language IN (${filter.languages.map((_, i) => `@l${i}`).join(',')})`)
      filter.languages.forEach((l, i) => (params[`l${i}`] = l))
    }

    const sortCol = SORT_COLUMNS[filter.sort?.by ?? 'modified'] ?? SORT_COLUMNS.modified
    const sortDir = filter.sort?.dir === 'asc' ? 'ASC' : 'DESC'

    const sql = `SELECT * FROM project WHERE ${where.join(' AND ')}
                 ORDER BY favorite DESC, ${sortCol} ${sortDir} NULLS LAST`
    const rows = getDb().prepare(sql).all(params) as ProjectRow[]

    let items = rows.map(toSummary)
    if (filter.frameworks?.length) {
      const want = new Set(filter.frameworks)
      items = items.filter((p) => p.frameworks.some((f) => want.has(f)))
    }
    if (filter.categories?.length) {
      const want = new Set(filter.categories)
      items = items.filter((p) => p.category && want.has(p.category))
    }
    // Attach cached git lite in one batch query.
    const gitMap = gitRepo.liteByProject()
    for (const it of items) it.git = gitMap.get(it.id)
    return { items, total: items.length }
  },

  get(id: string): ProjectDetail | null {
    const row = getDb().prepare('SELECT * FROM project WHERE id = ?').get(id) as ProjectRow | undefined
    if (!row) return null
    const summary = toSummary(row)
    summary.git = gitRepo.liteByProject().get(id)

    const stack = getDb()
      .prepare('SELECT layer, name, version, confidence, source FROM project_stack WHERE project_id = ? ORDER BY confidence DESC')
      .all(id) as StackItem[]
    const scripts = getDb()
      .prepare('SELECT name, command, runner, kind FROM project_script WHERE project_id = ?')
      .all(id) as ProjectScript[]
    const packages = getDb()
      .prepare('SELECT rel_path AS relPath, name, primary_language AS primaryLanguage FROM project_package WHERE project_id = ?')
      .all(id) as ProjectDetail['packages']

    return {
      ...summary,
      readmePath: row.readme_path ?? undefined,
      sizeBytes: row.size_bytes ?? undefined,
      stack,
      scripts,
      packages,
      firstSeenAt: row.first_seen_at,
      lastIndexedAt: row.last_indexed_at,
    }
  },

  toggleFavorite(id: string): ProjectSummary {
    getDb().prepare('UPDATE project SET favorite = 1 - favorite WHERE id = ?').run(id)
    return this.requireSummary(id)
  },

  setCategory(id: string, category: string | null): ProjectSummary {
    getDb().prepare('UPDATE project SET category = ? WHERE id = ?').run(category, id)
    return this.requireSummary(id)
  },

  markOpened(id: string): void {
    getDb().prepare('UPDATE project SET last_opened_at = ? WHERE id = ?').run(Date.now(), id)
  },

  requireSummary(id: string): ProjectSummary {
    const row = getDb().prepare('SELECT * FROM project WHERE id = ?').get(id) as ProjectRow | undefined
    if (!row) throw new Error(`Project not found: ${id}`)
    return toSummary(row)
  },

  pathFor(id: string): string | undefined {
    const row = getDb().prepare('SELECT path FROM project WHERE id = ?').get(id) as
      | { path: string }
      | undefined
    return row?.path
  },

  /** Deletes a project and remembers its path so re-scans don't re-add it. */
  remove(id: string): void {
    const db = getDb()
    const path = this.pathFor(id)
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM project WHERE id = ?').run(id)
      if (path) {
        db.prepare(
          'INSERT OR IGNORE INTO ignored_path (path, ignored_at) VALUES (?, ?)',
        ).run(path, Date.now())
      }
    })
    tx()
  },

  /** Paths the user has explicitly removed — the indexer skips these. */
  ignoredPaths(): Set<string> {
    const rows = getDb().prepare('SELECT path FROM ignored_path').all() as { path: string }[]
    return new Set(rows.map((r) => r.path))
  },
}
