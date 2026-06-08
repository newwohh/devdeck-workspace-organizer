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
    // Dedupe React so the standalone preview never loads two copies (which
    // triggers "Invalid hook call"). electron-vite's renderer config does this
    // for the real app; we must do it explicitly here.
    dedupe: ['react', 'react-dom'],
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer/src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', '@tanstack/react-query', 'zustand'],
  },
  plugins: [react()],
  server: { port: 5180, strictPort: true },
})
