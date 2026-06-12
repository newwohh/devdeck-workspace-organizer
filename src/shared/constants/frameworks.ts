/**
 * Framework allowlist. Only projects whose detected stack includes one of these
 * frameworks are indexed and shown; everything else is skipped (and pruned on
 * re-scan). An empty set disables the filter (allow all).
 *
 * Names must match exactly what the stack detectors emit (see engines/stack).
 */
export const ALLOWED_FRAMEWORKS: ReadonlySet<string> = new Set([
  'React',
  'Next.js',
  'Astro',
  'Express',
])

/** True if a project's detected frameworks pass the allowlist. */
export function isFrameworkAllowed(frameworks: readonly string[]): boolean {
  if (ALLOWED_FRAMEWORKS.size === 0) return true
  return frameworks.some((f) => ALLOWED_FRAMEWORKS.has(f))
}
