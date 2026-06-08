import { ipcMain, type BrowserWindow } from 'electron'
import {
  contract,
  isInvoke,
  type Access,
  type InputOf,
  type InvokeChannel,
  type OutputOf,
} from '@shared/ipc/contract'
import { checkPermission } from './permission-gate'

export interface HandlerContext {
  /** The window that issued the call (for confirmation dialogs, etc.). */
  window: BrowserWindow | null
  access: Access
}

/** A fully-typed handler for a specific channel. */
export type InvokeHandler<K extends InvokeChannel> = (
  input: InputOf<K>,
  ctx: HandlerContext,
) => Promise<OutputOf<K>> | OutputOf<K>

/** Storage-erased handler shape (the map can't hold per-channel generics). */
type AnyInvokeHandler = (input: never, ctx: HandlerContext) => unknown

const handlers = new Map<string, AnyInvokeHandler>()

/** Registers a typed handler for an invoke channel. */
export function handle<K extends InvokeChannel>(channel: K, handler: InvokeHandler<K>): void {
  handlers.set(channel, handler as AnyInvokeHandler)
}

/**
 * Binds every registered handler to ipcMain with validation + a permission gate.
 * Flow per call: validate input → permission gate → handler → validate output.
 * Any failure is caught, logged, and surfaced as a rejected promise — a bad
 * payload never reaches a handler.
 */
export function bindRouter(getWindow: () => BrowserWindow | null): void {
  for (const [channel, def] of Object.entries(contract)) {
    if (!isInvoke(def)) continue

    ipcMain.handle(channel, async (_event, rawInput) => {
      const handler = handlers.get(channel)
      if (!handler) throw new Error(`No handler registered for "${channel}"`)

      // 1. Validate input at the boundary.
      const parsedInput = def.input.safeParse(rawInput)
      if (!parsedInput.success) {
        console.error(`[ipc] invalid input for ${channel}:`, parsedInput.error.flatten())
        throw new Error(`Invalid input for ${channel}`)
      }

      const ctx: HandlerContext = { window: getWindow(), access: def.access }

      // 2. Permission gate (confirmation for mutating tiers).
      const allowed = await checkPermission(channel, def.access, ctx)
      if (!allowed) throw new Error(`Permission denied for ${channel}`)

      // 3. Run the handler.
      const result = await handler(parsedInput.data as never, ctx)

      // 4. Validate output (defends the renderer from a buggy handler).
      const parsedOutput = def.output.safeParse(result)
      if (!parsedOutput.success) {
        console.error(`[ipc] invalid output for ${channel}:`, parsedOutput.error.flatten())
        throw new Error(`Invalid output for ${channel}`)
      }
      return parsedOutput.data
    })
  }
}

/** Asserts at startup that every invoke channel has a handler. */
export function assertHandlersComplete(): void {
  const missing = Object.entries(contract)
    .filter(([ch, def]) => isInvoke(def) && !handlers.has(ch))
    .map(([ch]) => ch)
  if (missing.length > 0) {
    throw new Error(`Missing IPC handlers: ${missing.join(', ')}`)
  }
}
