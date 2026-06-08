import type { BrowserWindow } from 'electron'
import { settingsRepo } from '../../db/settings-repo'
import { handle } from '../router'

/** Registers settings IPC handlers. Emits a change event so the UI stays live. */
export function registerSettingsHandlers(getWindow: () => BrowserWindow | null): void {
  handle('settings.get', (input) => {
    return { key: input.key, value: settingsRepo.get(input.key) }
  })

  handle('settings.set', (input) => {
    settingsRepo.set(input.key, input.value)
    getWindow()?.webContents.send('events.settings.changed', {
      key: input.key,
      value: input.value,
    })
    return { ok: true as const }
  })
}
