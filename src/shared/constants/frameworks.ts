/**
 * Framework filter: optionally restrict which projects are indexed/shown to
 * those using a selected set of frameworks. Configurable from Settings.
 */
export interface FrameworkFilter {
  /** When false, the filter is off and every project is indexed. */
  enabled: boolean
  /** Framework names that pass the filter (must match detector output). */
  allowed: string[]
}

export const DEFAULT_FRAMEWORK_FILTER: FrameworkFilter = {
  enabled: true,
  allowed: ['React', 'Next.js', 'Astro', 'Express'],
}

/** The frameworks the UI lets you toggle — must match what detectors emit. */
export const ALL_FRAMEWORKS: string[] = [
  'React',
  'Next.js',
  'Remix',
  'Astro',
  'Vue',
  'Nuxt',
  'Angular',
  'Svelte',
  'SvelteKit',
  'Express',
  'NestJS',
  'Fastify',
  'Django',
  'FastAPI/Flask',
  'Laravel',
  'Rails',
  'Spring Boot',
  'Flutter',
  'Shopify App',
  'Shopify Theme',
]

/** True if a project's detected frameworks pass the filter. */
export function isFrameworkAllowed(
  frameworks: readonly string[],
  filter: FrameworkFilter,
): boolean {
  if (!filter.enabled) return true
  return frameworks.some((f) => filter.allowed.includes(f))
}
