# Security & Safety Model

DevDeck is designed to be **non-destructive to your system**. This document states the
guarantees, how they're enforced in code, and the one place where you (not the app) can cause
changes.

## Filesystem: read-only

**The application never writes, edits, deletes, moves, or renames files on your system.**

- The only `node:fs` calls in the entire main process are `readFile`, `readdir`, and `stat`
  (in [`engines/indexer`](src/main/engines/indexer/)) — all read-only.
- There are **zero** `writeFile` / `unlink` / `rm` / `rename` / `mkdir` / `chmod` / `trashItem`
  calls anywhere in the app code. (Enforceable via `grep`; covered conceptually by review.)
- The indexer reads only **manifest/marker files** (`package.json`, `go.mod`, etc.), never your
  source code, and never descends into ignored directories.
- Symbolic links are **not** followed during scanning, so a scan cannot escape the folders you
  selected.

The **only** thing the app writes is its own private database
(`~/Library/Application Support/DevDeck/devdeck.db`), created by SQLite in the OS-designated
per-app data directory. It contains DevDeck's index/metadata only — never your files, and never
anything outside that app directory. "Remove from DevDeck" deletes a **database row**, not the
project folder on disk.

## Git: read-only

The git integration runs only **read** commands: `git status`, `git log -1`, and
`git remote get-url` ([`engines/git/service.ts`](src/main/engines/git/service.ts)). There are
**no** write operations — no `commit`, `push`, `pull`, `checkout`, `reset`, `merge`, `clean`, or
`stash` — and no IPC channel exists that could trigger one. (Write actions are a planned,
explicitly-gated future feature; they do not exist today.)

## Processes: only your own dev servers, gracefully

- DevDeck **only detects** processes that are listening on a local TCP port (i.e. dev servers).
- The "Kill" action will **refuse any process DevDeck did not itself detect** — it is impossible
  to signal a system daemon or unrelated process from the UI
  ([`handlers/runtime.ts`](src/main/ipc/handlers/runtime.ts), guarded by `monitor.knows(pid)`).
- It only ever sends **`SIGTERM`** (a graceful stop), never `SIGKILL`.
- The OS provides a second layer: a non-root app cannot signal root-owned system processes
  (they fail with `EPERM`).

## External launches: read-only

"Open in editor / terminal / Finder" and opening URLs only *launch* applications
(`spawn('code', [path])`, `shell.openExternal(httpsUrl)`); they never modify anything. URLs are
restricted to an `http(s)`/known-scheme allow-list.

## The one exception: running your project's scripts (you, not the app)

The script runner ([`engines/process/run-manager.ts`](src/main/engines/process/run-manager.ts))
executes scripts **you explicitly choose to run** (e.g. clicking ▶ on `dev` or `build`). This is
the same as typing `npm run dev` in a terminal:

- A `build`/`migrate` script can legitimately write files **inside that project**, because that
  is what the script does. This is your code, run by your choice — not the app acting on its own.
- DevDeck **never runs any script automatically** — only on an explicit click, behind a
  confirmation.
- Scripts are spawned with **no shell** (`shell: false`, argument arrays), so there is no command
  injection from project names or paths.
- Scripts run with their working directory set to the project folder.

If you never click "run", the application is entirely read-only with respect to your files and
processes.

## Renderer sandbox

The UI runs sandboxed (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`,
strict CSP, blocked navigation/`window.open`/webviews). It reaches the privileged main process
only through a narrow, Zod-validated IPC contract behind a permission gate.

## Reporting

Found something? Open a private security advisory on the repository rather than a public issue.
