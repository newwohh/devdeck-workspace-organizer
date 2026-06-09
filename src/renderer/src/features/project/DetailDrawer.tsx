import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, StatusDot } from '../../components/ui'
import { ipc } from '../../lib/ipc'
import { homePath, relativeTime, typeIcon } from '../../lib/format'
import { useUIStore } from '../../store/ui'
import { useProject } from '../dashboard/useProjects'
import { RunPanel } from './RunPanel'

export function DetailDrawer() {
  const qc = useQueryClient()
  const { selectedId, select } = useUIStore()
  const { data: project, isLoading, isError, refetch } = useProject(selectedId)
  const git = useQuery({
    queryKey: ['git', 'status', selectedId],
    queryFn: () => ipc.invoke('git.status', { projectId: selectedId! }),
    enabled: !!selectedId,
  })

  if (!selectedId) return null

  return (
    <aside className="flex w-[360px] flex-col border-l border-border bg-subtle">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">Details</span>
        <button onClick={() => select(null)} className="text-muted hover:text-content" aria-label="Close">
          ✕
        </button>
      </header>

      {isLoading || !project ? (
        <div className="space-y-3 p-4 text-sm text-muted">
          {isLoading ? (
            'Loading…'
          ) : (
            <>
              <p>{isError ? "Couldn't load this project." : 'This project is no longer indexed.'}</p>
              <Button
                onClick={() => {
                  void refetch()
                  void ipc.invoke('index.rescan', {})
                }}
              >
                ⟳ Retry / re-scan
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span aria-hidden>{typeIcon(project.type)}</span>
              <h2 className="text-base font-semibold">{project.name}</h2>
              {project.favorite && <span className="text-yellow-400">★</span>}
            </div>
            <p className="truncate text-xs text-muted" title={project.path}>
              {homePath(project.path)}
            </p>
            {project.description && <p className="text-sm text-muted">{project.description}</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onClick={() => ipc.invoke('projects.open', { id: project.id, target: 'editor' })}>
              Open in editor
            </Button>
            <Button onClick={() => ipc.invoke('projects.open', { id: project.id, target: 'finder' })}>
              Reveal
            </Button>
          </div>

          <Section title="Overview">
            <Field label="Type"><span className="capitalize">{project.type}</span></Field>
            <Field label="Language">{project.primaryLanguage ?? '—'}</Field>
            <Field label="Package manager">{project.packageManager ?? '—'}</Field>
            <Field label="Health">
              <span className="flex items-center gap-1.5">
                <StatusDot level={project.health} /> {project.health}
              </span>
            </Field>
            <Field label="Modified">{relativeTime(project.fsModifiedAt)}</Field>
          </Section>

          {git.data?.isRepo && (
            <Section title="Git">
              <Field label="Branch">{git.data.branch ?? 'detached'}</Field>
              <Field label="State">
                <span className="flex items-center gap-1.5 capitalize">
                  <StatusDot
                    level={git.data.health === 'clean' ? 'ok' : git.data.health === 'conflicted' ? 'error' : 'warn'}
                  />
                  {git.data.health}
                </span>
              </Field>
              {(git.data.ahead > 0 || git.data.behind > 0) && (
                <Field label="Ahead / behind">
                  ↑{git.data.ahead} ↓{git.data.behind}
                </Field>
              )}
              {git.data.dirty && (
                <Field label="Changes">
                  {git.data.staged} staged · {git.data.modified} modified · {git.data.untracked} untracked
                </Field>
              )}
              {git.data.lastCommit && (
                <Field label="Last commit">
                  <span className="max-w-[200px] truncate" title={git.data.lastCommit.message}>
                    {git.data.lastCommit.message}
                  </span>
                </Field>
              )}
            </Section>
          )}

          {project.stack.length > 0 && (
            <Section title="Stack">
              <div className="flex flex-wrap gap-1">
                {project.stack.map((s) => (
                  <Badge key={`${s.layer}:${s.name}`} title={`${s.layer}${s.version ? ` · ${s.version}` : ''}`}>
                    {s.name}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {project.scripts.length > 0 && (
            <Section title="Scripts">
              <RunPanel projectId={project.id} scripts={project.scripts} />
            </Section>
          )}

          {project.packages.length > 0 && (
            <Section title={`Packages (${project.packages.length})`}>
              <ul className="space-y-1 text-xs text-muted">
                {project.packages.map((p) => (
                  <li key={p.relPath} className="flex justify-between">
                    <span>{p.name}</span>
                    <span className="font-mono text-zinc-600">{p.relPath}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Danger zone">
            <button
              onClick={async () => {
                const ok = window.confirm(
                  `Remove "${project.name}" from DevDeck?\n\nThis deletes it from the dashboard and database (the folder on disk is NOT touched). It won't reappear on re-scan.`,
                )
                if (!ok) return
                await ipc.invoke('projects.remove', { id: project.id })
                select(null)
                qc.invalidateQueries({ queryKey: ['projects'] })
                qc.invalidateQueries({ queryKey: ['roots'] })
              }}
              className="w-full rounded-md border border-danger/40 px-2 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10"
            >
              Remove from DevDeck
            </button>
          </Section>
        </div>
      )}
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className="text-content">{children}</span>
    </div>
  )
}
