import { Dashboard } from '../features/dashboard/Dashboard'
import { GitView } from '../features/git/GitView'
import { ProcessView } from '../features/process/ProcessView'
import { DetailDrawer } from '../features/project/DetailDrawer'
import { Sidebar } from '../features/sidebar/Sidebar'
import { useUIStore } from '../store/ui'

const VIEWS = {
  dashboard: Dashboard,
  git: GitView,
  processes: ProcessView,
}

export function AppShell() {
  const activeView = useUIStore((s) => s.activeView)
  const ActiveView = VIEWS[activeView]

  return (
    <div className="flex h-screen flex-col bg-base text-content">
      <header className="drag-region flex h-11 shrink-0 items-center justify-center border-b border-border text-[13px] font-medium text-muted">
        DevDeck
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden">
          <ActiveView />
          <DetailDrawer />
        </main>
      </div>
    </div>
  )
}
