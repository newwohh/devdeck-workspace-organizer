import { join } from 'node:path'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { runMigrations } from './migrate'

let db: Database.Database | null = null

/** Returns the process-wide SQLite handle, initializing + migrating on first use. */
export function getDb(): Database.Database {
  if (db) return db

  const file = join(app.getPath('userData'), 'devdeck.db')
  db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  const result = runMigrations(db)
  if (result.applied.length > 0) {
    console.log(`[db] migrated ${result.from} → ${result.to} (${result.applied.join(', ')})`)
  }

  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}
