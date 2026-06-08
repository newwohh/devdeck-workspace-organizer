import type { DevDeckBridge } from '@shared/ipc/api'
import { browserMockBridge } from './ipc-mock'

/**
 * Typed accessor for the preload bridge. The renderer always goes through this,
 * never `window.devdeck` directly, so the contract types are enforced at every
 * call site. Falls back to a mock when served as a plain web page (preview).
 */
export const ipc: DevDeckBridge = window.devdeck ?? browserMockBridge
