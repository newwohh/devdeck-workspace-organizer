import type { StackItem, StackLayer } from '@shared/schemas/project'

/** Everything a detector needs, read once per project. */
export interface DetectContext {
  /** Absolute project path. */
  path: string
  /** Top-level entry names plus a handful of probed nested config files. */
  files: Set<string>
  /** Merged dependencies + devDependencies (name → version) from package.json. */
  deps: Map<string, string>
  /** Ecosystems implied by marker files (node, python, go, …). */
  ecosystems: Set<string>
  /** Raw parsed package.json, if present. */
  pkg?: PackageJson
}

export interface PackageJson {
  name?: string
  version?: string
  description?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  packageManager?: string
  workspaces?: string[] | { packages?: string[] }
  bin?: string | Record<string, string>
  main?: string
  module?: string
  exports?: unknown
  type?: string
}

export interface StackDetector {
  id: string
  detect(ctx: DetectContext): StackItem[]
}

/** Small helpers shared by detectors. */
export const dep = (ctx: DetectContext, name: string): string | undefined => ctx.deps.get(name)
export const hasDep = (ctx: DetectContext, ...names: string[]): boolean =>
  names.some((n) => ctx.deps.has(n))
export const hasFile = (ctx: DetectContext, ...names: string[]): boolean =>
  names.some((n) => ctx.files.has(n))

export const hit = (
  layer: StackLayer,
  name: string,
  opts: { version?: string; confidence?: number; source?: string } = {},
): StackItem => ({
  layer,
  name,
  version: opts.version,
  confidence: opts.confidence ?? 1,
  source: opts.source,
})
