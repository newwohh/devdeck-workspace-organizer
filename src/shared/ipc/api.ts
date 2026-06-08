import type { EventChannel, InputOf, InvokeChannel, OutputOf, PayloadOf } from './contract'

/**
 * The exact shape exposed on `window.devdeck` by the preload bridge.
 * Renderer code imports this type (never `ipcRenderer`).
 */
export interface DevDeckBridge {
  invoke<K extends InvokeChannel>(channel: K, input: InputOf<K>): Promise<OutputOf<K>>
  on<K extends EventChannel>(channel: K, listener: (payload: PayloadOf<K>) => void): () => void
}

declare global {
  interface Window {
    devdeck: DevDeckBridge
  }
}
