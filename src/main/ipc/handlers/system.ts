import { app } from 'electron'
import { handle } from '../router'

/** Registers system/diagnostic IPC handlers. */
export function registerSystemHandlers(): void {
  handle('system.ping', (input) => {
    return { reply: `pong: ${input.message}`, pid: process.pid, ts: Date.now() }
  })

  handle('system.appInfo', () => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron ?? 'unknown',
    node: process.versions.node,
    chrome: process.versions.chrome ?? 'unknown',
    platform: process.platform,
  }))
}
