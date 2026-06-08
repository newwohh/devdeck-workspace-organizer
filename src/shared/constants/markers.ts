/**
 * Project-discovery constants. A directory is a project boundary if it contains
 * any marker file. Directories in HARD_IGNORE are never descended into.
 */

export const MARKERS: Record<string, { ecosystem: string }> = {
  '.git': { ecosystem: 'vcs' },
  'package.json': { ecosystem: 'node' },
  'pnpm-workspace.yaml': { ecosystem: 'node' },
  'turbo.json': { ecosystem: 'node' },
  'deno.json': { ecosystem: 'deno' },
  'deno.jsonc': { ecosystem: 'deno' },
  'go.mod': { ecosystem: 'go' },
  'Cargo.toml': { ecosystem: 'rust' },
  'pyproject.toml': { ecosystem: 'python' },
  'requirements.txt': { ecosystem: 'python' },
  'Pipfile': { ecosystem: 'python' },
  'composer.json': { ecosystem: 'php' },
  'Gemfile': { ecosystem: 'ruby' },
  'pom.xml': { ecosystem: 'java' },
  'build.gradle': { ecosystem: 'java' },
  'build.gradle.kts': { ecosystem: 'java' },
  'pubspec.yaml': { ecosystem: 'dart' },
  'mix.exs': { ecosystem: 'elixir' },
}

export const MARKER_FILES = Object.keys(MARKERS)

/** Directories that are never scanned into (cost + noise). */
export const HARD_IGNORE = new Set<string>([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.cache',
  'coverage',
  'vendor',
  'target',
  'Pods',
  '.venv',
  'venv',
  '__pycache__',
  '.idea',
  '.vscode',
  '.DS_Store',
  '.gradle',
  'bin',
  'obj',
])

/** Marks a node project as a monorepo root. */
export const MONOREPO_MARKERS = ['pnpm-workspace.yaml', 'turbo.json', 'lerna.json', 'nx.json']
