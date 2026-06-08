export interface Listener {
  pid: number
  port: number
}

/**
 * Parses `lsof -nP -iTCP -sTCP:LISTEN -F pn` output. Pure function (testable).
 *
 * Field-mode output is line-oriented: a `p<pid>` line sets the current process,
 * each following `n<addr>:<port>` line is one of its listening sockets:
 *   p1234
 *   n127.0.0.1:3000
 *   n[::1]:3000
 *   p5678
 *   n*:5173
 */
export function parseListeners(output: string): Listener[] {
  const seen = new Set<string>()
  const result: Listener[] = []
  let pid = 0

  for (const line of output.split('\n')) {
    if (line.startsWith('p')) {
      pid = Number(line.slice(1))
    } else if (line.startsWith('n') && pid) {
      const addr = line.slice(1)
      const portStr = addr.slice(addr.lastIndexOf(':') + 1)
      const port = Number(portStr)
      if (!Number.isFinite(port) || port <= 0) continue
      const key = `${pid}:${port}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push({ pid, port })
    }
  }
  return result
}

const PROCESS_NAMES: [RegExp, string][] = [
  [/vite/, 'Vite'],
  [/next(\s|\/|-)/, 'Next.js'],
  [/nuxt/, 'Nuxt'],
  [/webpack/, 'webpack'],
  [/remix/, 'Remix'],
  [/astro/, 'Astro'],
  [/uvicorn/, 'Uvicorn'],
  [/gunicorn/, 'Gunicorn'],
  [/flask/, 'Flask'],
  [/manage\.py runserver/, 'Django'],
  [/rails/, 'Rails'],
  [/artisan serve/, 'Laravel'],
  [/\bgo\b.*run/, 'Go'],
  [/cargo.*run/, 'Cargo'],
  [/node/, 'Node'],
  [/python/, 'Python'],
]

/** Derives a friendly process name from its command line. */
export function deriveProcessName(command: string): string {
  for (const [re, name] of PROCESS_NAMES) if (re.test(command)) return name
  const first = command.trim().split(/\s+/)[0] ?? 'process'
  return first.split('/').pop() ?? first
}
