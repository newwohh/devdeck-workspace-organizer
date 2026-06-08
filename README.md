# DevDeck — Developer Workspace Manager

A centralized command center for developers: automatically discover, organize, monitor, and
manage all your local development projects from a single native macOS interface.

> **Status:** Phase 0 (foundations) — the secure process model, typed IPC, and storage layer are
> wired end to end. Feature engines land in subsequent phases.

## About

DevDeck collapses the overhead of juggling many local projects into one native surface: it
automatically **discovers** projects across your dev folders, **classifies** their stack
(React, Next.js, Django, Go, Rust, Shopify apps, and more), and surfaces their live state —
git status, running services, ports, URLs, Docker, and databases — at a glance. Organize
projects into workspaces, run their scripts, and launch them in your editor of choice without
leaving the app.

Built for freelancers, agency and full-stack developers, Shopify developers, and startup teams
who manage multiple projects at once. macOS-first, local-first, privacy-first.

Development happens on a **single `main` branch**.

## Stack

- **Electron** + **TypeScript** (strict) via **electron-vite**
- **React 18** + **Tailwind CSS** + **TanStack Query** + **Zustand** (renderer)
- **better-sqlite3** (storage, migrations) · **Zod** (IPC validation)

## Architecture at a glance

```
main (privileged: fs, db, git, docker)  ──typed, Zod-validated IPC──►  renderer (sandboxed UI)
   │                                          ▲
   └── utilityProcess workers (scanning)      └── preload bridge (window.devdeck, the only surface)
```

- Renderer runs sandboxed: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, strict CSP.
- Every IPC channel is declared once in [`src/shared/ipc/contract.ts`](src/shared/ipc/contract.ts) and validated at the main boundary.
- Mutating channels pass through a permission gate (`src/main/ipc/permission-gate.ts`).
- SQLite is the single source of truth; the UI is a projection updated via events, never polling.

The full technical blueprint (product spec, data model, engines, frontend, roadmap) lives in
`docs/` (kept out of version control).

## Develop

```bash
npm install
npm run rebuild        # rebuild native modules (better-sqlite3) against Electron — needed before `dev`
npm run dev            # launch the real Electron app with HMR (native window, full IPC + SQLite)
npm run dev:web        # serve just the renderer UI in a browser (port 5180); IPC is mocked
```

## Verify

```bash
npm run typecheck      # tsc (node + web projects)
npm run lint           # eslint
npm test               # vitest (migration runner, etc.)
npm run build          # electron-vite production bundle
```

## Project layout

```
src/
├─ main/        # main process: db, ipc router + handlers, security
├─ preload/     # contextBridge surface (window.devdeck)
├─ renderer/    # React UI
└─ shared/      # IPC contract + domain types, imported by both sides
```

## License

MIT
