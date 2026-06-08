import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Standalone web build of the renderer — serves the React UI as a plain web
 * page (no Electron) for previewing/iterating in a browser. The renderer's IPC
 * calls fall back to a mock bridge in this context (see lib/ipc.ts).
 */
export default defineConfig({
  root: 'src/renderer',
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer/src'),
    },
  },
  plugins: [react()],
  server: { port: 5180, strictPort: true },
})
