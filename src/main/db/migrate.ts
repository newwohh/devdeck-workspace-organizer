import type Database from 'better-sqlite3'
import { migrations } from './migrations'

export interface MigrateResult {
  from: number
  to: number
  applied: string[]
}

/**
 * Applies all pending migrations in a single transaction, tracking progress via
 * the `user_version` pragma. Idempotent: already-applied migrations are skipped.
 * Exported standalone (takes a db handle) so it is unit-testable against an
 * in-memory database without Electron.
 */
export function runMigrations(db: Database.Database): MigrateResult {
  const from = db.pragma('user_version', { simple: true }) as number
  const pending = migrations
    .filter((m) => m.version > from)
    .sort((a, b) => a.version - b.version)

  const applied: string[] = []
  const tx = db.transaction(() => {
    for (const m of pending) {
      db.exec(m.sql)
      db.pragma(`user_version = ${m.version}`)
      applied.push(`${m.version}_${m.name}`)
    }
  })
  tx()

  return { from, to: db.pragma('user_version', { simple: true }) as number, applied }
}
