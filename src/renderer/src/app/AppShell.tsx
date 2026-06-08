import { Dashboard } from '../features/dashboard/Dashboard'
import { DetailDrawer } from '../features/project/DetailDrawer'
import { Sidebar } from '../features/sidebar/Sidebar'

export function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-base text-content">
      <header className="drag-region flex h-11 shrink-0 items-center justify-center border-b border-border text-[13px] font-medium text-muted">
        DevDeck
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden">
          <Dashboard />
          <DetailDrawer />
        </main>
      </div>
    </div>
  )
}
