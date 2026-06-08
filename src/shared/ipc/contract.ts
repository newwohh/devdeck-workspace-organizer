import { z } from 'zod'
import { gitRepoRowSchema, gitStatusSchema } from '../schemas/git'
import {
  projectDetailSchema,
  projectFilterSchema,
  projectSummarySchema,
  scanRootSchema,
} from '../schemas/project'

/**
 * The single source of truth for every IPC channel.
 *
 * The main-process router and the preload bridge are BOTH derived from this
 * object, so channels can never be stringly-typed or drift between sides.
 * Every payload is validated with these Zod schemas at the main boundary.
 */

export type Access = 'read' | 'mutate:low' | 'mutate:medium' | 'mutate:high'

export interface InvokeDef<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  readonly kind: 'invoke'
  readonly access: Access
  readonly input: I
  readonly output: O
}

export interface EventDef<P extends z.ZodTypeAny> {
  readonly kind: 'event'
  readonly payload: P
}

export type AnyChannelDef = InvokeDef<z.ZodTypeAny, z.ZodTypeAny> | EventDef<z.ZodTypeAny>

const invoke = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  access: Access,
  input: I,
  output: O,
): InvokeDef<I, O> => ({ kind: 'invoke', access, input, output })

const event = <P extends z.ZodTypeAny>(payload: P): EventDef<P> => ({ kind: 'event', payload })

// ─── Channel definitions ──────────────────────────────────────────────────────

export const contract = {
  /** Round-trips a message — proves the full IPC pipeline end to end. */
  'system.ping': invoke(
    'read',
    z.object({ message: z.string() }),
    z.object({ reply: z.string(), pid: z.number(), ts: z.number() }),
  ),

  /** App + runtime version info for the about/footer surface. */
  'system.appInfo': invoke(
    'read',
    z.void(),
    z.object({
      name: z.string(),
      version: z.string(),
      electron: z.string(),
      node: z.string(),
      chrome: z.string(),
      platform: z.string(),
    }),
  ),

  /** Reads a persisted setting (durable, from SQLite). */
  'settings.get': invoke(
    'read',
    z.object({ key: z.string() }),
    z.object({ key: z.string(), value: z.unknown().nullable() }),
  ),

  /** Writes a persisted setting. */
  'settings.set': invoke(
    'mutate:low',
    z.object({ key: z.string(), value: z.unknown() }),
    z.object({ ok: z.literal(true) }),
  ),

  /** Push: emitted when a setting changes (proves main→renderer events). */
  'events.settings.changed': event(z.object({ key: z.string(), value: z.unknown().nullable() })),

  // ─── Scan roots ─────────────────────────────────────────────────────────────
  'roots.list': invoke('read', z.void(), z.array(scanRootSchema)),
  'roots.add': invoke('mutate:medium', z.object({ path: z.string() }), scanRootSchema),
  'roots.remove': invoke('mutate:medium', z.object({ id: z.string() }), z.object({ ok: z.literal(true) })),
  /** Opens a native folder picker; returns the chosen path (or null if cancelled). */
  'roots.pick': invoke('read', z.void(), z.object({ path: z.string().nullable() })),

  // ─── Indexing ───────────────────────────────────────────────────────────────
  'index.rescan': invoke(
    'mutate:low',
    z.object({ rootId: z.string().optional() }),
    z.object({ jobId: z.string() }),
  ),

  // ─── Projects ───────────────────────────────────────────────────────────────
  'projects.list': invoke(
    'read',
    projectFilterSchema,
    z.object({ items: z.array(projectSummarySchema), total: z.number() }),
  ),
  'projects.get': invoke('read', z.object({ id: z.string() }), projectDetailSchema.nullable()),
  'projects.toggleFavorite': invoke('mutate:low', z.object({ id: z.string() }), projectSummarySchema),
  'projects.setCategory': invoke(
    'mutate:low',
    z.object({ id: z.string(), category: z.string().nullable() }),
    projectSummarySchema,
  ),
  /** Opens the project in an external target. */
  'projects.open': invoke(
    'mutate:low',
    z.object({ id: z.string(), target: z.enum(['editor', 'terminal', 'finder']) }),
    z.object({ ok: z.literal(true) }),
  ),

  // ─── Git (read) ───────────────────────────────────────────────────────────────
  'git.available': invoke('read', z.void(), z.object({ ok: z.boolean() })),
  'git.status': invoke('read', z.object({ projectId: z.string() }), gitStatusSchema.nullable()),
  'git.statusAll': invoke('read', z.void(), z.array(gitRepoRowSchema)),
  /** Recomputes git status (all repos, or one root) in the background. */
  'git.refresh': invoke(
    'mutate:low',
    z.object({ rootId: z.string().optional() }),
    z.object({ jobId: z.string() }),
  ),

  // ─── Index/project events ─────────────────────────────────────────────────────
  'events.scan.progress': event(
    z.object({
      jobId: z.string(),
      rootId: z.string(),
      scanned: z.number(),
      found: z.number(),
      done: z.boolean(),
      currentPath: z.string().optional(),
    }),
  ),
  'events.projects.changed': event(z.object({ rootId: z.string().optional() })),
  'events.git.changed': event(z.object({})),
} as const satisfies Record<string, AnyChannelDef>

export type Contract = typeof contract
export type Channel = keyof Contract

// ─── Derived helper types (consumed by router + bridge + renderer) ─────────────

export type InvokeChannel = {
  [K in Channel]: Contract[K]['kind'] extends 'invoke' ? K : never
}[Channel]

export type EventChannel = {
  [K in Channel]: Contract[K]['kind'] extends 'event' ? K : never
}[Channel]

export type InputOf<K extends InvokeChannel> =
  Contract[K] extends InvokeDef<infer I, z.ZodTypeAny> ? z.infer<I> : never

export type OutputOf<K extends InvokeChannel> =
  Contract[K] extends InvokeDef<z.ZodTypeAny, infer O> ? z.infer<O> : never

export type PayloadOf<K extends EventChannel> =
  Contract[K] extends EventDef<infer P> ? z.infer<P> : never

export const isInvoke = (def: AnyChannelDef): def is InvokeDef<z.ZodTypeAny, z.ZodTypeAny> =>
  def.kind === 'invoke'

export const isEvent = (def: AnyChannelDef): def is EventDef<z.ZodTypeAny> => def.kind === 'event'
