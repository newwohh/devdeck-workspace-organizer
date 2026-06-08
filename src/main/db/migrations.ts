/**
 * Forward-only migrations, embedded as strings so they ship reliably inside the
 * packaged app (no runtime fs path resolution). `version` maps to SQLite's
 * `user_version` pragma. Add new migrations by appending to this array.
 */
export interface Migration {
  version: number
  name: string
  sql: string
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'init',
    sql: /* sql */ `
      CREATE TABLE setting (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL          -- JSON-encoded
      );

      CREATE TABLE scan_root (
        id         TEXT PRIMARY KEY,
        path       TEXT NOT NULL UNIQUE,
        enabled    INTEGER NOT NULL DEFAULT 1,
        max_depth  INTEGER NOT NULL DEFAULT 6,
        created_at INTEGER NOT NULL
      );
    `,
  },
]
