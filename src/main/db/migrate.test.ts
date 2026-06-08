import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { migrations } from './migrations'
import { runMigrations } from './migrate'

const LATEST = Math.max(...migrations.map((m) => m.version))

describe('runMigrations', () => {
  it('applies all pending migrations from a fresh database', () => {
    const db = new Database(':memory:')
    const result = runMigrations(db)

    expect(result.from).toBe(0)
    expect(result.to).toBe(LATEST)
    expect(result.applied).toHaveLength(migrations.length)

    // The init migration's tables exist.
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name)
    expect(tables).toContain('setting')
    expect(tables).toContain('scan_root')

    db.close()
  })

  it('is idempotent — a second run applies nothing', () => {
    const db = new Database(':memory:')
    runMigrations(db)
    const second = runMigrations(db)

    expect(second.applied).toHaveLength(0)
    expect(second.from).toBe(LATEST)
    expect(second.to).toBe(LATEST)

    db.close()
  })

  it('records the schema version in user_version', () => {
    const db = new Database(':memory:')
    runMigrations(db)
    expect(db.pragma('user_version', { simple: true })).toBe(LATEST)
    db.close()
  })
})
