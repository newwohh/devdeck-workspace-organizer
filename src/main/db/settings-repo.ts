import { getDb } from './connection'

/** Typed data access for the `setting` KV table. Values are JSON-encoded. */
export const settingsRepo = {
  get(key: string): unknown {
    const row = getDb().prepare('SELECT value FROM setting WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row ? (JSON.parse(row.value) as unknown) : null
  },

  set(key: string, value: unknown): void {
    getDb()
      .prepare(
        `INSERT INTO setting (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, JSON.stringify(value))
  },
}
