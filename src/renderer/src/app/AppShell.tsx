import { Dashboard } from '../features/dashboard/Dashboard'
import { GitView } from '../features/git/GitView'
import { DetailDrawer } from '../features/project/DetailDrawer'
import { Sidebar } from '../features/sidebar/Sidebar'
import { useUIStore } from '../store/ui'

export function AppShell() {
  const activeView = useUIStore((s) => s.activeView)

  return (
    <div className="flex h-screen flex-col bg-base text-content">
      <header className="drag-region flex h-11 shrink-0 items-center justify-center border-b border-border text-[13px] font-medium text-muted">
        DevDeck
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden">
          {activeView === 'dashboard' ? <Dashboard /> : <GitView />}
          <DetailDrawer />
        </main>
      </div>
    </div>
  )
}
