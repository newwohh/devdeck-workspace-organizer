/**
 * Project-discovery constants. A directory is a project boundary if it contains
 * any marker — either an exact filename (`package.json`) or a filename suffix
 * (`*.csproj`). Directories in HARD_IGNORE are never descended into.
 */

/** Exact marker filename → ecosystem token. */
export const MARKER_FILE_ECOSYSTEM: Record<string, string> = {
  // VCS
  '.git': 'vcs',
  // JS / TS
  'package.json': 'node',
  'pnpm-workspace.yaml': 'node',
  'turbo.json': 'node',
  'deno.json': 'deno',
  'deno.jsonc': 'deno',
  // Go / Rust
  'go.mod': 'go',
  'Cargo.toml': 'rust',
  // Python
  'pyproject.toml': 'python',
  'requirements.txt': 'python',
  'Pipfile': 'python',
  'setup.py': 'python',
  'setup.cfg': 'python',
  'environment.yml': 'python',
  'conda.yaml': 'python',
  // PHP / Ruby
  'composer.json': 'php',
  'Gemfile': 'ruby',
  // Java / Kotlin / Scala
  'pom.xml': 'java',
  'build.gradle': 'java',
  'build.gradle.kts': 'java',
  'settings.gradle': 'java',
  'build.sbt': 'scala',
  // C / C++
  'CMakeLists.txt': 'cpp',
  'meson.build': 'cpp',
  'conanfile.txt': 'cpp',
  'conanfile.py': 'cpp',
  'vcpkg.json': 'cpp',
  'configure.ac': 'c',
  'Makefile': 'make',
  'makefile': 'make',
  'GNUmakefile': 'make',
  // .NET (also via *.csproj/*.sln suffixes below)
  'global.json': 'dotnet',
  // Swift / Apple
  'Package.swift': 'swift',
  'Podfile': 'swift',
  // Dart / Flutter
  'pubspec.yaml': 'dart',
  // Elixir / Erlang
  'mix.exs': 'elixir',
  'rebar.config': 'erlang',
  // Zig
  'build.zig': 'zig',
  // Nix
  'flake.nix': 'nix',
  'default.nix': 'nix',
  'shell.nix': 'nix',
  // Haskell
  'stack.yaml': 'haskell',
  'cabal.project': 'haskell',
  // Clojure
  'deps.edn': 'clojure',
  'project.clj': 'clojure',
  'shadow-cljs.edn': 'clojure',
  // Crystal
  'shard.yml': 'crystal',
  // Bazel
  WORKSPACE: 'bazel',
  'WORKSPACE.bazel': 'bazel',
  'MODULE.bazel': 'bazel',
}

/** Filename suffix → ecosystem token (for glob-style project files). */
export const MARKER_SUFFIX_ECOSYSTEM: Record<string, string> = {
  '.csproj': 'dotnet',
  '.sln': 'dotnet',
  '.fsproj': 'dotnet',
  '.vbproj': 'dotnet',
  '.vcxproj': 'cpp',
  '.xcodeproj': 'swift',
  '.xcworkspace': 'swift',
  '.cabal': 'haskell',
  '.gemspec': 'ruby',
  '.nimble': 'nim',
}

export const MARKER_FILES = Object.keys(MARKER_FILE_ECOSYSTEM)
const MARKER_FILE_SET = new Set(MARKER_FILES)
export const MARKER_SUFFIXES = Object.keys(MARKER_SUFFIX_ECOSYSTEM)

/** Whether a filename qualifies as a project marker. */
export function isMarker(name: string): boolean {
  if (MARKER_FILE_SET.has(name)) return true
  return MARKER_SUFFIXES.some((s) => name.endsWith(s))
}

/** Maps a marker filename to its ecosystem token. */
export function markerEcosystem(name: string): string | undefined {
  const exact = MARKER_FILE_ECOSYSTEM[name]
  if (exact) return exact
  for (const s of MARKER_SUFFIXES) if (name.endsWith(s)) return MARKER_SUFFIX_ECOSYSTEM[s]
  return undefined
}

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
  'cmake-build-debug',
  'cmake-build-release',
  'DerivedData',
  '.stack-work',
  'zig-cache',
  'zig-out',
])

/** Marks a node project as a monorepo root. */
export const MONOREPO_MARKERS = ['pnpm-workspace.yaml', 'turbo.json', 'lerna.json', 'nx.json']
