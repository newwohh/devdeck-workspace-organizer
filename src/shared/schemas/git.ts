import { z } from 'zod'

export const gitHealthSchema = z.enum([
  'clean',
  'dirty',
  'conflicted',
  'detached',
  'behind',
  'unknown',
])
export type GitHealth = z.infer<typeof gitHealthSchema>

/** Cheap status for grid badges (cards, list rows). */
export const gitStatusLiteSchema = z.object({
  isRepo: z.boolean(),
  branch: z.string().optional(),
  ahead: z.number().int().nonnegative(),
  behind: z.number().int().nonnegative(),
  dirty: z.boolean(),
  conflicted: z.boolean(),
  health: gitHealthSchema,
})
export type GitStatusLite = z.infer<typeof gitStatusLiteSchema>

/** Full status for the detail drawer + git view. */
export const gitStatusSchema = gitStatusLiteSchema.extend({
  upstream: z.string().optional(),
  staged: z.number().int().nonnegative(),
  modified: z.number().int().nonnegative(),
  untracked: z.number().int().nonnegative(),
  remoteUrl: z.string().optional(),
  lastCommit: z
    .object({
      hash: z.string(),
      message: z.string(),
      author: z.string(),
      at: z.number(),
    })
    .optional(),
  capturedAt: z.number(),
})
export type GitStatus = z.infer<typeof gitStatusSchema>

/** A row in the multi-repo status view. */
export const gitRepoRowSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  path: z.string(),
  git: gitStatusSchema,
})
export type GitRepoRow = z.infer<typeof gitRepoRowSchema>
