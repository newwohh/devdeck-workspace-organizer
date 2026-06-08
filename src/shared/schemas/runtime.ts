import { z } from 'zod'

/** A running dev process detected by its listening TCP port. */
export const processInfoSchema = z.object({
  pid: z.number().int(),
  name: z.string(),
  command: z.string(),
  cpu: z.number(),
  memoryBytes: z.number().int().nonnegative(),
  port: z.number().int().optional(),
  url: z.string().optional(),
  projectId: z.string().nullable().optional(),
  projectName: z.string().optional(),
})
export type ProcessInfo = z.infer<typeof processInfoSchema>

/** A script run session (spawned dev/build/test command). */
export const runSessionSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  scriptName: z.string(),
  running: z.boolean(),
  exitCode: z.number().nullable(),
})
export type RunSession = z.infer<typeof runSessionSchema>

export const terminalChunkSchema = z.object({
  sessionId: z.string(),
  data: z.string(),
  stream: z.enum(['stdout', 'stderr', 'system']),
})
export type TerminalChunk = z.infer<typeof terminalChunkSchema>
