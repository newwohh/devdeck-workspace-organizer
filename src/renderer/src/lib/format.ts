const TYPE_ICON: Record<string, string> = {
  app: '▲',
  service: '◆',
  library: '◇',
  monorepo: '⬡',
  cli: '⌘',
  theme: '◈',
  infra: '⚙',
  unknown: '○',
}

export const typeIcon = (type: string): string => TYPE_ICON[type] ?? '○'

const LANG_COLOR: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#f1e05a',
  python: '#3572A5',
  go: '#00ADD8',
  rust: '#dea584',
  php: '#4F5D95',
  ruby: '#701516',
  java: '#b07219',
  dart: '#00B4AB',
  elixir: '#6e4a7e',
}

export const langColor = (lang?: string): string => (lang ? (LANG_COLOR[lang] ?? '#888') : '#888')

/** Relative-time formatter for "modified 3h ago". */
export function relativeTime(ms?: number): string {
  if (!ms) return '—'
  const diff = Date.now() - ms
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(mo / 12)}y ago`
}

export const homePath = (path: string): string => path.replace(/^\/Users\/[^/]+/, '~')
