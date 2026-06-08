import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ProjectFilter } from '@shared/schemas/project'
import { ipc } from '../../lib/ipc'
import { qk } from '../../lib/query-keys'

export function useProjects(filter: ProjectFilter) {
  return useQuery({
    queryKey: qk.projects(filter),
    queryFn: () => ipc.invoke('projects.list', filter),
    placeholderData: keepPreviousData,
  })
}

export function useRoots() {
  return useQuery({ queryKey: qk.roots(), queryFn: () => ipc.invoke('roots.list', undefined) })
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: id ? qk.project(id) : ['project', 'none'],
    queryFn: () => ipc.invoke('projects.get', { id: id! }),
    enabled: !!id,
  })
}
