import { join } from 'node:path'
import { app, BrowserWindow, nativeTheme } from 'electron'
import { getDb, closeDb } from './db/connection'
import { applySecurity } from './security'
import { assertHandlersComplete, bindRouter } from './ipc/router'
import { registerSystemHandlers } from './ipc/handlers/system'
import { registerSettingsHandlers } from './ipc/handlers/settings'
import { registerProjectHandlers } from './ipc/handlers/projects'
import { registerGitHandlers } from './ipc/handlers/git'

let mainWindow: BrowserWindow | null = null
const getWindow = () => mainWindow

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0b' : '#ffffff',
    vibrancy: 'sidebar',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  applySecurity(mainWindow)

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // electron-vite injects ELECTRON_RENDERER_URL in dev; load the file in prod.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Initialize storage (runs migrations) before any IPC can touch it.
  getDb()

  // Wire IPC: register handlers, then bind the validated router.
  registerSystemHandlers()
  registerSettingsHandlers(getWindow)
  registerProjectHandlers(getWindow)
  registerGitHandlers(getWindow)
  assertHandlersComplete()
  bindRouter(getWindow)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => closeDb())
