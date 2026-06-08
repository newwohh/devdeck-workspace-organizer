import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { markerEcosystem, MONOREPO_MARKERS } from '@shared/constants/markers'
import type { ProjectScript, ProjectType } from '@shared/schemas/project'
import { runDetectors } from '../stack'
import type { DetectContext, PackageJson } from '../stack'
import type { DiscoveredProject } from './types'

const README_NAMES = ['README.md', 'README.markdown', 'README.txt', 'readme.md', 'README']

/** Reads a project directory and produces a fully-classified DiscoveredProject. */
export async function analyzeProject(path: string, markers: string[]): Promise<DiscoveredProject> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  const files = new Set(entries.map((e) => e.name))

  const pkg = files.has('package.json') ? await readJson<PackageJson>(join(path, 'package.json')) : undefined
  const ecosystems = new Set<string>()
  for (const m of markers) {
    const eco = markerEcosystem(m)
    if (eco) ecosystems.add(eco)
  }

  const deps = new Map<string, string>()
  if (pkg) {
    for (const [k, v] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      deps.set(k, String(v))
    }
  }

  const ctx: DetectContext = { path, files, deps, ecosystems, pkg }
  const stack = runDetectors(ctx)

  const primaryLanguage = detectLanguage(ecosystems, files, deps)
  const packageManager = detectPackageManager(files, pkg)
  const isMonorepo = MONOREPO_MARKERS.some((m) => files.has(m)) || pkg?.workspaces != null
  const scripts = collectScripts(pkg, packageManager, files)
  const type = resolveType({ stack, pkg, files, ecosystems, isMonorepo })

  const frameworks = stack
    .filter((s) => s.layer === 'frontend' || s.layer === 'backend')
    .map((s) => s.name)

  const name = pkg?.name?.split('/').pop() ?? (await deriveName(path, files)) ?? basename(path)
  const readme = README_NAMES.find((r) => files.has(r))
  const description = pkg?.description

  const packages = isMonorepo ? await findPackages(path) : []
  const fsModifiedAt = await newestMarkerMtime(path, markers)
  const indexHash = computeHash(markers, pkg)

  return {
    path,
    name,
    type,
    primaryLanguage,
    packageManager,
    isMonorepo,
    description,
    readmePath: readme ? join(path, readme) : undefined,
    frameworks,
    stack,
    scripts,
    packages,
    fsModifiedAt,
    indexHash,
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch {
    return undefined
  }
}

function detectLanguage(
  ecosystems: Set<string>,
  files: Set<string>,
  deps: Map<string, string>,
): string | undefined {
  if (ecosystems.has('node')) {
    return files.has('tsconfig.json') || deps.has('typescript') ? 'typescript' : 'javascript'
  }
  if (ecosystems.has('deno')) return 'typescript'
  const map: Record<string, string> = {
    python: 'python',
    go: 'go',
    rust: 'rust',
    php: 'php',
    ruby: 'ruby',
    java: 'java',
    scala: 'scala',
    dart: 'dart',
    elixir: 'elixir',
    erlang: 'erlang',
    dotnet: 'csharp',
    cpp: 'cpp',
    c: 'c',
    swift: 'swift',
    zig: 'zig',
    nix: 'nix',
    haskell: 'haskell',
    clojure: 'clojure',
    crystal: 'crystal',
    nim: 'nim',
  }
  // Real languages win over build-system-only ecosystems (make, bazel, vcs).
  for (const eco of ecosystems) if (map[eco]) return map[eco]
  return undefined
}

function detectPackageManager(files: Set<string>, pkg?: PackageJson): string | undefined {
  if (pkg?.packageManager) return pkg.packageManager.split('@')[0]
  if (files.has('pnpm-lock.yaml')) return 'pnpm'
  if (files.has('yarn.lock')) return 'yarn'
  if (files.has('bun.lockb')) return 'bun'
  if (files.has('package-lock.json')) return 'npm'
  if (files.has('package.json')) return 'npm'
  if (files.has('Cargo.toml')) return 'cargo'
  if (files.has('go.mod')) return 'go'
  if (files.has('composer.json')) return 'composer'
  if (files.has('Package.swift')) return 'swift'
  if (hasSuffix(files, '.csproj', '.sln', '.fsproj') || files.has('global.json')) return 'dotnet'
  if (files.has('CMakeLists.txt')) return 'cmake'
  if (files.has('meson.build')) return 'meson'
  if (files.has('build.sbt')) return 'sbt'
  if (files.has('build.zig')) return 'zig'
  if (files.has('stack.yaml')) return 'stack'
  if (files.has('deps.edn')) return 'clojure'
  if (files.has('Makefile') || files.has('makefile') || files.has('GNUmakefile')) return 'make'
  if (files.has('requirements.txt') || files.has('pyproject.toml') || files.has('setup.py')) return 'pip'
  return undefined
}

function hasSuffix(files: Set<string>, ...suffixes: string[]): boolean {
  for (const f of files) if (suffixes.some((s) => f.endsWith(s))) return true
  return false
}

function classifyScriptKind(name: string): ProjectScript['kind'] {
  const n = name.toLowerCase()
  if (/^(dev|develop|serve|watch)/.test(n)) return 'dev'
  if (/^(start)/.test(n)) return 'start'
  if (/^(build|compile|bundle)/.test(n)) return 'build'
  if (/^(test|spec|e2e)/.test(n)) return 'test'
  if (/^(lint|format|typecheck)/.test(n)) return 'lint'
  if (/(migrate|migration|db:)/.test(n)) return 'migrate'
  return 'other'
}

function collectScripts(
  pkg: PackageJson | undefined,
  packageManager: string | undefined,
  files: Set<string>,
): ProjectScript[] {
  const out: ProjectScript[] = []
  const runner = (packageManager ?? 'npm') as ProjectScript['runner']
  if (pkg?.scripts) {
    for (const [name, command] of Object.entries(pkg.scripts)) {
      out.push({ name, command, runner, kind: classifyScriptKind(name) })
    }
  }
  if (files.has('Cargo.toml')) {
    out.push(
      { name: 'run', command: 'cargo run', runner: 'cargo', kind: 'dev' },
      { name: 'build', command: 'cargo build', runner: 'cargo', kind: 'build' },
      { name: 'test', command: 'cargo test', runner: 'cargo', kind: 'test' },
    )
  }
  if (files.has('go.mod')) {
    out.push(
      { name: 'run', command: 'go run .', runner: 'go', kind: 'dev' },
      { name: 'build', command: 'go build ./...', runner: 'go', kind: 'build' },
      { name: 'test', command: 'go test ./...', runner: 'go', kind: 'test' },
    )
  }
  if (files.has('manage.py')) {
    out.push({ name: 'runserver', command: 'python manage.py runserver', runner: 'python', kind: 'dev' })
  }
  if (files.has('CMakeLists.txt')) {
    out.push(
      { name: 'configure', command: 'cmake -B build', runner: 'other', kind: 'build' },
      { name: 'build', command: 'cmake --build build', runner: 'other', kind: 'build' },
    )
  } else if (files.has('Makefile') || files.has('makefile') || files.has('GNUmakefile')) {
    out.push({ name: 'make', command: 'make', runner: 'make', kind: 'build' })
  }
  if (hasSuffix(files, '.csproj', '.sln', '.fsproj')) {
    out.push(
      { name: 'build', command: 'dotnet build', runner: 'other', kind: 'build' },
      { name: 'run', command: 'dotnet run', runner: 'other', kind: 'dev' },
      { name: 'test', command: 'dotnet test', runner: 'other', kind: 'test' },
    )
  }
  if (files.has('Package.swift')) {
    out.push(
      { name: 'build', command: 'swift build', runner: 'other', kind: 'build' },
      { name: 'run', command: 'swift run', runner: 'other', kind: 'dev' },
      { name: 'test', command: 'swift test', runner: 'other', kind: 'test' },
    )
  }
  return out
}

function resolveType(args: {
  stack: DiscoveredProject['stack']
  pkg?: PackageJson
  files: Set<string>
  ecosystems: Set<string>
  isMonorepo: boolean
}): ProjectType {
  const { stack, pkg, files, ecosystems, isMonorepo } = args
  if (isMonorepo) return 'monorepo'

  const layers = new Set(stack.map((s) => s.layer))
  const names = new Set(stack.map((s) => s.name))

  if (names.has('Shopify Theme')) return 'theme'
  if (pkg?.bin) return 'cli'

  const onlyInfra =
    layers.has('infra') && !layers.has('frontend') && !layers.has('backend') && !pkg?.dependencies
  if (onlyInfra && (files.has('Dockerfile') || files.has('main.tf') || files.has('terraform')))
    return 'infra'

  if (layers.has('backend')) return 'service'
  if (layers.has('frontend')) return 'app'

  // A node package that exports but has no app/server framework → library.
  if (ecosystems.has('node') && (pkg?.main || pkg?.module || pkg?.exports)) return 'library'

  if (ecosystems.size > 0) return 'app'
  return 'unknown'
}

async function deriveName(path: string, files: Set<string>): Promise<string | undefined> {
  if (files.has('go.mod')) {
    const mod = await readFirstMatch(join(path, 'go.mod'), /^module\s+(\S+)/m)
    if (mod) return mod.split('/').pop()
  }
  if (files.has('Cargo.toml')) {
    const n = await readFirstMatch(join(path, 'Cargo.toml'), /name\s*=\s*"([^"]+)"/)
    if (n) return n
  }
  if (files.has('pyproject.toml')) {
    const n = await readFirstMatch(join(path, 'pyproject.toml'), /name\s*=\s*"([^"]+)"/)
    if (n) return n
  }
  return undefined
}

async function readFirstMatch(file: string, re: RegExp): Promise<string | undefined> {
  try {
    return (await readFile(file, 'utf8')).match(re)?.[1]
  } catch {
    return undefined
  }
}

async function findPackages(
  root: string,
): Promise<{ relPath: string; name: string; primaryLanguage?: string }[]> {
  // Phase 1: shallow scan of conventional workspace dirs for package.json.
  const out: { relPath: string; name: string }[] = []
  for (const dir of ['packages', 'apps', 'services']) {
    const base = join(root, dir)
    const entries = await readdir(base, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const pkg = await readJson<PackageJson>(join(base, e.name, 'package.json'))
      if (pkg) out.push({ relPath: `${dir}/${e.name}`, name: pkg.name ?? e.name })
    }
  }
  return out
}

async function newestMarkerMtime(path: string, markers: string[]): Promise<number | undefined> {
  let newest: number | undefined
  for (const m of markers) {
    if (m === '.git') continue
    const s = await stat(join(path, m)).catch(() => null)
    if (s) newest = Math.max(newest ?? 0, s.mtimeMs)
  }
  return newest ? Math.round(newest) : undefined
}

function computeHash(markers: string[], pkg?: PackageJson): string {
  const h = createHash('sha1')
  h.update(markers.sort().join(','))
  if (pkg) h.update(JSON.stringify({ d: pkg.dependencies, dd: pkg.devDependencies, s: pkg.scripts }))
  return h.digest('hex').slice(0, 16)
}
