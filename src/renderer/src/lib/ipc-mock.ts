import type { DevDeckBridge } from '@shared/ipc/api'

/**
 * Browser-preview shim for the Electron preload bridge.
 *
 * Inside Electron the real `window.devdeck` is always present and this is never
 * used. It only activates when the renderer is served as a plain web page (e.g.
 * Claude Code's preview panel, Storybook, `vite` standalone) so the UI can
 * render and be iterated on without the main process. Returns canned data and
 * an in-memory settings store; it is NOT wired to SQLite or any real engine.
 */
const store = new Map<string, unknown>()
const listeners = new Map<string, Set<(payload: any) => void>>()

function emit(channel: string, payload: unknown): void {
  listeners.get(channel)?.forEach((cb) => cb(payload))
}

export const browserMockBridge: DevDeckBridge = {
  async invoke(channel, input): Promise<any> {
    switch (channel) {
      case 'system.appInfo':
        return {
          name: 'DevDeck',
          version: '0.0.1',
          electron: 'web-preview',
          node: 'web-preview',
          chrome: 'web-preview',
          platform: 'web',
        }
      case 'system.ping':
        return { reply: `pong: ${(input as { message: string }).message}`, pid: 0, ts: Date.now() }
      case 'settings.get': {
        const key = (input as { key: string }).key
        return { key, value: store.get(key) ?? null }
      }
      case 'settings.set': {
        const { key, value } = input as { key: string; value: unknown }
        store.set(key, value)
        emit('events.settings.changed', { key, value })
        return { ok: true }
      }
      default:
        throw new Error(`browserMockBridge: unhandled channel "${channel}"`)
    }
  },

  on(channel, listener): () => void {
    const set = listeners.get(channel) ?? new Set()
    set.add(listener as (p: any) => void)
    listeners.set(channel, set)
    return () => set.delete(listener as (p: any) => void)
  },
}
