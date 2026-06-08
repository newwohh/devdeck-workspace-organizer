import { app, session, shell, type BrowserWindow } from 'electron'

/** URL schemes the app is allowed to hand off to the OS. */
const ALLOWED_EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'vscode:', 'cursor:', 'mailto:'])

/**
 * Applies the renderer hardening that isn't expressed in webPreferences:
 *  - a strict Content-Security-Policy (relaxed only for the dev server's HMR)
 *  - deny all in-app navigation and window.open
 *  - route vetted external links through the OS browser
 */
export function applySecurity(window: BrowserWindow): void {
  const isDev = !app.isPackaged

  const csp = isDev
    ? // Vite dev server needs inline styles + ws HMR.
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; connect-src 'self' ws: http://localhost:*; object-src 'none'; frame-src 'none'"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'"

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  const wc = window.webContents

  // Block all window.open; vet and hand off allowed external links.
  wc.setWindowOpenHandler(({ url }) => {
    void openExternalIfAllowed(url)
    return { action: 'deny' }
  })

  // Block navigation away from the app shell.
  wc.on('will-navigate', (event, url) => {
    const isInternal = url.startsWith('file:') || url.startsWith('http://localhost')
    if (!isInternal) {
      event.preventDefault()
      void openExternalIfAllowed(url)
    }
  })

  // Never attach webviews.
  wc.on('will-attach-webview', (event) => event.preventDefault())
}

async function openExternalIfAllowed(url: string): Promise<void> {
  try {
    const scheme = new URL(url).protocol
    if (ALLOWED_EXTERNAL_SCHEMES.has(scheme)) await shell.openExternal(url)
  } catch {
    /* malformed URL — ignore */
  }
}
