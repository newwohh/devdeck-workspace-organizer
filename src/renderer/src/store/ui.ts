import { create } from 'zustand'
import type { ProjectFilter, ProjectType } from '@shared/schemas/project'

export type ViewMode = 'grid' | 'list'
export type AppView = 'dashboard' | 'git' | 'processes'

interface ScanState {
  active: boolean
  scanned: number
  found: number
}

interface UIState {
  activeView: AppView
  selectedId: string | null
  view: ViewMode
  filter: ProjectFilter
  scan: ScanState

  setActiveView: (v: AppView) => void
  select: (id: string | null) => void
  setView: (v: ViewMode) => void
  setText: (text: string) => void
  toggleType: (type: ProjectType) => void
  setSort: (by: NonNullable<ProjectFilter['sort']>['by']) => void
  updateScan: (p: { scanned: number; found: number; done: boolean }) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeView: 'dashboard',
  selectedId: null,
  view: 'grid',
  filter: { sort: { by: 'modified', dir: 'desc' } },
  scan: { active: false, scanned: 0, found: 0 },

  setActiveView: (activeView) => set({ activeView }),
  select: (id) => set({ selectedId: id }),
  setView: (view) => set({ view }),
  setText: (text) => set((s) => ({ filter: { ...s.filter, text: text || undefined } })),

  toggleType: (type) =>
    set((s) => {
      const cur = new Set(s.filter.types ?? [])
      if (cur.has(type)) cur.delete(type)
      else cur.add(type)
      return { filter: { ...s.filter, types: cur.size ? [...cur] : undefined } }
    }),

  setSort: (by) =>
    set((s) => ({
      filter: {
        ...s.filter,
        sort: { by, dir: s.filter.sort?.by === by && s.filter.sort.dir === 'desc' ? 'asc' : 'desc' },
      },
    })),

  updateScan: (p) =>
    set({ scan: { active: !p.done, scanned: p.scanned, found: p.found } }),
}))
