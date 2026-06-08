import { spawn, type ChildProcess } from 'node:child_process'
import { delimiter } from 'node:path'
import type { ProjectScript } from '@shared/schemas/project'
import type { RunSession, TerminalChunk } from '@shared/schemas/runtime'
import { newId } from '../../db/ids'

const MAX_BUFFER_CHARS = 256 * 1024 // ring-buffer cap per session

interface Session {
  id: string
  projectId: string
  scriptName: string
  child: ChildProcess
  buffer: string
  running: boolean
  exitCode: number | null
}

type Emit = {
  data: (chunk: TerminalChunk) => void
  exit: (sessionId: string, code: number | null) => void
}

/** Resolves the program + args to spawn for a detected script (no shell). */
function resolveCommand(script: ProjectScript): { cmd: string; args: string[] } {
  const nodePms = new Set(['npm', 'pnpm', 'yarn', 'bun'])
  if (nodePms.has(script.runner)) {
    return { cmd: script.runner, args: ['run', script.name] }
  }
  const tokens = script.command.trim().split(/\s+/)
  return { cmd: tokens[0], args: tokens.slice(1) }
}

/** Augments PATH so GUI-launched Electron can find common toolchains. */
function runEnv(): NodeJS.ProcessEnv {
  const extra = ['/opt/homebrew/bin', '/usr/local/bin', `${process.env.HOME}/.local/bin`]
  const path = [process.env.PATH ?? '', ...extra].join(delimiter)
  return { ...process.env, PATH: path, FORCE_COLOR: '1' }
}

/** Owns spawned script sessions and streams their output to the renderer. */
export class RunManager {
  private sessions = new Map<string, Session>()

  constructor(private emit: Emit) {}

  run(projectId: string, cwd: string, script: ProjectScript): string {
    const { cmd, args } = resolveCommand(script)
    const child = spawn(cmd, args, { cwd, env: runEnv(), shell: false })

    const id = newId('sess')
    const session: Session = { id, projectId, scriptName: script.name, child, buffer: '', running: true, exitCode: null }
    this.sessions.set(id, session)

    this.push(session, `$ ${cmd} ${args.join(' ')}\n`, 'system')
    child.stdout?.on('data', (d: Buffer) => this.push(session, d.toString(), 'stdout'))
    child.stderr?.on('data', (d: Buffer) => this.push(session, d.toString(), 'stderr'))
    child.on('error', (err) => this.push(session, `\n[failed to start: ${err.message}]\n`, 'system'))
    child.on('close', (code) => {
      session.running = false
      session.exitCode = code
      this.push(session, `\n[exited with code ${code ?? 0}]\n`, 'system')
      this.emit.exit(id, code)
    })
    return id
  }

  private push(session: Session, data: string, stream: TerminalChunk['stream']): void {
    session.buffer = (session.buffer + data).slice(-MAX_BUFFER_CHARS)
    this.emit.data({ sessionId: session.id, data, stream })
  }

  stop(sessionId: string): void {
    const s = this.sessions.get(sessionId)
    if (!s?.running) return
    s.child.kill('SIGTERM')
    setTimeout(() => {
      if (s.running) s.child.kill('SIGKILL')
    }, 4000)
  }

  output(sessionId: string): string {
    return this.sessions.get(sessionId)?.buffer ?? ''
  }

  list(): RunSession[] {
    return [...this.sessions.values()].map((s) => ({
      sessionId: s.id,
      projectId: s.projectId,
      scriptName: s.scriptName,
      running: s.running,
      exitCode: s.exitCode,
    }))
  }

  disposeAll(): void {
    for (const s of this.sessions.values()) if (s.running) s.child.kill('SIGKILL')
    this.sessions.clear()
  }
}
