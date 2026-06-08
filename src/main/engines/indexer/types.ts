import type { ProjectScript, ProjectType, StackItem } from '@shared/schemas/project'

/** A project as produced by the indexer, before persistence. */
export interface DiscoveredProject {
  path: string
  name: string
  type: ProjectType
  primaryLanguage?: string
  packageManager?: string
  isMonorepo: boolean
  description?: string
  readmePath?: string
  frameworks: string[]
  stack: StackItem[]
  scripts: ProjectScript[]
  packages: { relPath: string; name: string; primaryLanguage?: string }[]
  sizeBytes?: number
  fsModifiedAt?: number
  indexHash: string
}
