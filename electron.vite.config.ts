import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const shared = resolve('src/shared')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': shared,
        '@main': resolve('src/main'),
      },
    },
    build: {
      rollupOptions: { input: resolve('src/main/index.ts') },
    },
  },
  preload: {
    // NOTE: no externalizeDepsPlugin here. A sandboxed preload cannot require
    // arbitrary node modules, so the contract's Zod dependency must be bundled
    // inline. Only `electron` (whitelisted in the sandbox) stays external.
    resolve: {
      alias: { '@shared': shared },
    },
    build: {
      // Sandboxed preload must be CommonJS; emit as index.js (not .mjs) so the
      // main process can load it at the expected path.
      rollupOptions: {
        input: resolve('src/preload/index.ts'),
        external: ['electron'],
        output: { format: 'cjs', entryFileNames: '[name].js' },
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@shared': shared,
        '@renderer': resolve('src/renderer/src'),
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: { input: resolve('src/renderer/index.html') },
    },
  },
})
