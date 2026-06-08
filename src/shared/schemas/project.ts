import { z } from 'zod'
import { gitStatusLiteSchema } from './git'

export const projectTypeSchema = z.enum([
  'app',
  'library',
  'monorepo',
  'service',
  'cli',
  'theme',
  'infra',
  'unknown',
])
export type ProjectType = z.infer<typeof projectTypeSchema>

export const healthLevelSchema = z.enum(['ok', 'warn', 'error', 'unknown'])
export type HealthLevel = z.infer<typeof healthLevelSchema>

export const stackLayerSchema = z.enum([
  'language',
  'frontend',
  'backend',
  'database',
  'orm',
  'auth',
  'payments',
  'analytics',
  'hosting',
  'infra',
  'testing',
  'build',
])
export type StackLayer = z.infer<typeof stackLayerSchema>

export const stackItemSchema = z.object({
  layer: stackLayerSchema,
  name: z.string(),
  version: z.string().optional(),
  confidence: z.number().min(0).max(1),
  source: z.string().optional(),
})
export type StackItem = z.infer<typeof stackItemSchema>

export const projectScriptSchema = z.object({
  name: z.string(),
  command: z.string(),
  runner: z.enum(['npm', 'pnpm', 'yarn', 'bun', 'make', 'python', 'go', 'cargo', 'composer', 'other']),
  kind: z.enum(['dev', 'build', 'test', 'lint', 'start', 'migrate', 'other']).optional(),
})
export type ProjectScript = z.infer<typeof projectScriptSchema>

export const scanRootSchema = z.object({
  id: z.string(),
  path: z.string(),
  enabled: z.boolean(),
  maxDepth: z.number().int().positive(),
  createdAt: z.number(),
  projectCount: z.number().int().nonnegative(),
})
export type ScanRoot = z.infer<typeof scanRootSchema>

export const projectSummarySchema = z.object({
  id: z.string(),
  rootId: z.string(),
  name: z.string(),
  path: z.string(),
  type: projectTypeSchema,
  primaryLanguage: z.string().optional(),
  packageManager: z.string().optional(),
  isMonorepo: z.boolean(),
  category: z.string().nullable(),
  health: healthLevelSchema,
  favorite: z.boolean(),
  frameworks: z.array(z.string()),
  tags: z.array(z.string()),
  description: z.string().optional(),
  fsModifiedAt: z.number().optional(),
  lastOpenedAt: z.number().optional(),
  git: gitStatusLiteSchema.optional(),
})
export type ProjectSummary = z.infer<typeof projectSummarySchema>

export const projectDetailSchema = projectSummarySchema.extend({
  readmePath: z.string().optional(),
  sizeBytes: z.number().optional(),
  stack: z.array(stackItemSchema),
  scripts: z.array(projectScriptSchema),
  packages: z.array(
    z.object({ relPath: z.string(), name: z.string(), primaryLanguage: z.string().optional() }),
  ),
  firstSeenAt: z.number(),
  lastIndexedAt: z.number(),
})
export type ProjectDetail = z.infer<typeof projectDetailSchema>

export const projectSortSchema = z.object({
  by: z.enum(['name', 'modified', 'opened', 'type']),
  dir: z.enum(['asc', 'desc']),
})

export const projectFilterSchema = z.object({
  text: z.string().optional(),
  languages: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  types: z.array(projectTypeSchema).optional(),
  rootId: z.string().optional(),
  sort: projectSortSchema.optional(),
})
export type ProjectFilter = z.infer<typeof projectFilterSchema>
