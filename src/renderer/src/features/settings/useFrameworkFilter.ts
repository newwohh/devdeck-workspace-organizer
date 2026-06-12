import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ipc } from '../../lib/ipc'

export function useFrameworkFilter() {
  return useQuery({ queryKey: ['frameworks'], queryFn: () => ipc.invoke('frameworks.get', undefined) })
}

export function useSetFrameworkFilter() {
  const qc = useQueryClient()
  return async (filter: { enabled: boolean; allowed: string[] }) => {
    await ipc.invoke('frameworks.set', filter)
    qc.invalidateQueries({ queryKey: ['frameworks'] })
    qc.invalidateQueries({ queryKey: ['projects'] })
    qc.invalidateQueries({ queryKey: ['roots'] })
  }
}
