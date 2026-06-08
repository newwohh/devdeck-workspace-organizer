import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { contract, isEvent } from '@shared/ipc/contract'

/**
 * The ONLY surface the renderer can reach. No `ipcRenderer`, no Node APIs leak
 * to the page. Channel names are validated against the contract so a typo (or a
 * compromised renderer) cannot reach an undeclared channel. Main re-validates
 * every payload regardless.
 */

const eventChannels = new Set(
  Object.entries(contract)
    .filter(([, def]) => isEvent(def))
    .map(([channel]) => channel),
)

const bridge = {
  invoke(channel: string, input?: unknown): Promise<unknown> {
    if (!(channel in contract)) {
      return Promise.reject(new Error(`Unknown IPC channel: ${channel}`))
    }
    return ipcRenderer.invoke(channel, input)
  },

  on(channel: string, listener: (payload: unknown) => void): () => void {
    if (!eventChannels.has(channel)) {
      throw new Error(`Not an event channel: ${channel}`)
    }
    const wrapped = (_event: IpcRendererEvent, payload: unknown) => listener(payload)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },
}

contextBridge.exposeInMainWorld('devdeck', bridge)
