import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ipc } from '../../lib/ipc'

/** Opens the native folder picker and adds the chosen folder as a scan root. */
export function useAddFolder() {
  const qc = useQueryClient()
  return async () => {
    const picked = await ipc.invoke('roots.pick', undefined)
    if (!picked.path) return
    await ipc.invoke('roots.add', { path: picked.path })
    qc.invalidateQueries({ queryKey: ['roots'] })
    qc.invalidateQueries({ queryKey: ['projects'] })
  }
}

export function useIgnores() {
  return useQuery({ queryKey: ['ignores'], queryFn: () => ipc.invoke('ignores.list', undefined) })
}
