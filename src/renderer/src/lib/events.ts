import type { QueryClient } from '@tanstack/react-query'
import { useUIStore } from '../store/ui'
import { ipc } from './ipc'

/**
 * Subscribes to main→renderer push events and translates them into query-cache
 * invalidations + store updates. The UI is a pure projection: it never polls.
 */
export function wireLiveEvents(qc: QueryClient): () => void {
  const disposers = [
    ipc.on('events.projects.changed', () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['roots'] })
    }),

    ipc.on('events.scan.progress', (p) => {
      useUIStore.getState().updateScan({ scanned: p.scanned, found: p.found, done: p.done })
      if (p.done) {
        qc.invalidateQueries({ queryKey: ['projects'] })
        qc.invalidateQueries({ queryKey: ['roots'] })
      }
    }),

    ipc.on('events.git.changed', () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['git'] })
    }),

    ipc.on('events.process.changed', () => {
      qc.invalidateQueries({ queryKey: ['processes'] })
    }),
  ]
  return () => disposers.forEach((d) => d())
}
