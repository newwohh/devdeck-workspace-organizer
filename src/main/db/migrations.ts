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
  {
    version: 2,
    name: 'projects',
    sql: /* sql */ `
      CREATE TABLE project (
        id               TEXT PRIMARY KEY,
        root_id          TEXT NOT NULL REFERENCES scan_root(id) ON DELETE CASCADE,
        path             TEXT NOT NULL UNIQUE,
        name             TEXT NOT NULL,
        type             TEXT NOT NULL,
        primary_language TEXT,
        package_manager  TEXT,
        is_monorepo      INTEGER NOT NULL DEFAULT 0,
        category         TEXT,
        health           TEXT NOT NULL DEFAULT 'unknown',
        favorite         INTEGER NOT NULL DEFAULT 0,
        description      TEXT,
        readme_path      TEXT,
        size_bytes       INTEGER,
        fs_modified_at   INTEGER,
        last_opened_at   INTEGER,
        first_seen_at    INTEGER NOT NULL,
        last_indexed_at  INTEGER NOT NULL,
        index_hash       TEXT,
        archived         INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_project_root ON project(root_id);
      CREATE INDEX idx_project_modified ON project(fs_modified_at DESC);
      CREATE INDEX idx_project_type ON project(type);

      CREATE TABLE project_stack (
        project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        layer      TEXT NOT NULL,
        name       TEXT NOT NULL,
        version    TEXT,
        confidence REAL NOT NULL DEFAULT 1.0,
        source     TEXT,
        PRIMARY KEY (project_id, layer, name)
      );

      CREATE TABLE project_script (
        project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        name       TEXT NOT NULL,
        command    TEXT NOT NULL,
        runner     TEXT NOT NULL,
        kind       TEXT,
        PRIMARY KEY (project_id, name)
      );

      CREATE TABLE project_package (
        project_id       TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        rel_path         TEXT NOT NULL,
        name             TEXT NOT NULL,
        primary_language TEXT,
        PRIMARY KEY (project_id, rel_path)
      );

      CREATE TABLE tag (
        id    TEXT PRIMARY KEY,
        name  TEXT NOT NULL UNIQUE,
        color TEXT
      );
      CREATE TABLE project_tag (
        project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        tag_id     TEXT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, tag_id)
      );
    `,
  },
  {
    version: 3,
    name: 'git_status',
    sql: /* sql */ `
      CREATE TABLE git_status (
        project_id        TEXT PRIMARY KEY REFERENCES project(id) ON DELETE CASCADE,
        is_repo           INTEGER NOT NULL,
        branch            TEXT,
        upstream          TEXT,
        ahead             INTEGER NOT NULL DEFAULT 0,
        behind            INTEGER NOT NULL DEFAULT 0,
        staged            INTEGER NOT NULL DEFAULT 0,
        modified          INTEGER NOT NULL DEFAULT 0,
        untracked         INTEGER NOT NULL DEFAULT 0,
        conflicted        INTEGER NOT NULL DEFAULT 0,
        dirty             INTEGER NOT NULL DEFAULT 0,
        remote_url        TEXT,
        last_commit_hash  TEXT,
        last_commit_msg   TEXT,
        last_commit_author TEXT,
        last_commit_at    INTEGER,
        health            TEXT NOT NULL DEFAULT 'unknown',
        captured_at       INTEGER NOT NULL
      );
    `,
  },
]
