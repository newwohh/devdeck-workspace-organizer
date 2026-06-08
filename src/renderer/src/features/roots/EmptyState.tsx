import { Button } from '../../components/ui'

export function EmptyState({ onAddRoot, busy }: { onAddRoot: () => void; busy: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="max-w-md space-y-4 text-center">
        <div className="text-4xl" aria-hidden>
          🗂️
        </div>
        <h2 className="text-lg font-semibold">Add a folder to get started</h2>
        <p className="text-sm text-muted">
          DevDeck scans the folders you choose and automatically discovers every project — detecting
          its language, framework, and scripts. Point it at where you keep your code.
        </p>
        <Button variant="primary" onClick={onAddRoot} disabled={busy}>
          {busy ? 'Scanning…' : '＋ Add a scan folder'}
        </Button>
      </div>
    </div>
  )
}
