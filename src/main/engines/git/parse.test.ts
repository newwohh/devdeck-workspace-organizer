import { describe, expect, it } from 'vitest'
import { deriveHealth, parsePorcelainV2 } from './parse'

describe('parsePorcelainV2', () => {
  it('parses branch, upstream, ahead/behind, and file states', () => {
    const out = [
      '# branch.oid abc123',
      '# branch.head main',
      '# branch.upstream origin/main',
      '# branch.ab +2 -1',
      '1 M. N... 100644 100644 100644 aaa bbb src/staged.ts',
      '1 .M N... 100644 100644 100644 aaa bbb src/modified.ts',
      '1 MM N... 100644 100644 100644 aaa bbb src/both.ts',
      '? untracked.ts',
      '? another.txt',
    ].join('\n')

    const s = parsePorcelainV2(out)
    expect(s.branch).toBe('main')
    expect(s.upstream).toBe('origin/main')
    expect(s.ahead).toBe(2)
    expect(s.behind).toBe(1)
    expect(s.staged).toBe(2) // staged.ts + both.ts (X != '.')
    expect(s.modified).toBe(2) // modified.ts + both.ts (Y != '.')
    expect(s.untracked).toBe(2)
    expect(s.conflicted).toBe(0)
    expect(s.detached).toBe(false)
    expect(deriveHealth(s)).toBe('behind')
  })

  it('detects a detached HEAD', () => {
    const s = parsePorcelainV2('# branch.head (detached)\n# branch.ab +0 -0')
    expect(s.detached).toBe(true)
    expect(s.branch).toBeUndefined()
    expect(deriveHealth(s)).toBe('detached')
  })

  it('counts conflicts and prioritizes conflicted health', () => {
    const out = ['# branch.head feature', '# branch.ab +0 -3', 'u UU N... 1 2 3 a b c conflict.ts'].join('\n')
    const s = parsePorcelainV2(out)
    expect(s.conflicted).toBe(1)
    expect(deriveHealth(s)).toBe('conflicted')
  })

  it('reports a clean repo', () => {
    const s = parsePorcelainV2('# branch.head main\n# branch.upstream origin/main\n# branch.ab +0 -0')
    expect(deriveHealth(s)).toBe('clean')
  })
})
