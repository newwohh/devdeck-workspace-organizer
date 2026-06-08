import type { ProjectFilter } from '@shared/schemas/project'

export const qk = {
  appInfo: () => ['system', 'appInfo'] as const,
  roots: () => ['roots'] as const,
  projects: (filter?: ProjectFilter) => ['projects', filter ?? {}] as const,
  project: (id: string) => ['project', id] as const,
}
