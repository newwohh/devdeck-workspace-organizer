import { describe, expect, it } from 'vitest'
import { deriveProcessName, parseListeners } from './lsof'

describe('parseListeners', () => {
  it('parses pids and ports, deduping ipv4/ipv6 of the same socket', () => {
    const out = ['p1234', 'n127.0.0.1:3000', 'n[::1]:3000', 'p5678', 'n*:5173'].join('\n')
    const listeners = parseListeners(out)
    // 1234 has 3000 on both v4 and v6 → one entry; 5678 has 5173.
    expect(listeners).toEqual([
      { pid: 1234, port: 3000 },
      { pid: 5678, port: 5173 },
    ])
  })

  it('ignores malformed lines', () => {
    expect(parseListeners('n1.2.3.4:80\np\nnoport')).toEqual([])
  })
})

describe('deriveProcessName', () => {
  it('recognizes common dev servers', () => {
    expect(deriveProcessName('node /x/node_modules/.bin/vite')).toBe('Vite')
    expect(deriveProcessName('/usr/bin/python manage.py runserver')).toBe('Django')
    expect(deriveProcessName('uvicorn app:main')).toBe('Uvicorn')
  })

  it('falls back to the binary basename', () => {
    expect(deriveProcessName('/opt/homebrew/bin/caddy run')).toBe('caddy')
  })
})
