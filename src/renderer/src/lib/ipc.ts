import type { DevDeckBridge } from '@shared/ipc/api'

/**
 * Typed accessor for the preload bridge. The renderer always goes through this,
 * never `window.devdeck` directly, so the contract types are enforced at every
 * call site.
 */
export const ipc: DevDeckBridge = window.devdeck
