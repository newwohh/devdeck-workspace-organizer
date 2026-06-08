import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { analyzeProject } from './analyze'
import { walkForProjects } from './walk'

let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'devdeck-test-'))

  // A Next.js + Prisma app (TypeScript).
  const web = join(root, 'web-app')
  await mkdir(web, { recursive: true })
  await writeFile(join(web, 'tsconfig.json'), '{}')
  await writeFile(join(web, 'next.config.js'), 'module.exports = {}')
  await writeFile(
    join(web, 'package.json'),
    JSON.stringify({
      name: '@acme/web-app',
      description: 'storefront',
      scripts: { dev: 'next dev', build: 'next build', test: 'vitest' },
      dependencies: { next: '14.2.0', react: '18.3.1', '@prisma/client': '5.0.0' },
      devDependencies: { typescript: '5.5.0', prisma: '5.0.0' },
    }),
  )
  // node_modules must be ignored by the walk.
  await mkdir(join(web, 'node_modules', 'left-pad'), { recursive: true })
  await writeFile(join(web, 'node_modules', 'left-pad', 'package.json'), '{"name":"left-pad"}')

  // A Go service.
  const svc = join(root, 'go-svc')
  await mkdir(svc, { recursive: true })
  await writeFile(join(svc, 'go.mod'), 'module github.com/acme/billing\n\ngo 1.22\n')
})

afterAll(async () => {
  // tmp dir is cleaned by the OS; nothing to do.
})

describe('walkForProjects', () => {
  it('finds project boundaries and ignores node_modules', async () => {
    const found = await walkForProjects(root, 6)
    const names = found.map((c) => c.path.split('/').pop()).sort()
    expect(names).toEqual(['go-svc', 'web-app'])
  })
})

describe('analyzeProject', () => {
  it('classifies a Next.js + Prisma TypeScript app', async () => {
    const p = await analyzeProject(join(root, 'web-app'), ['package.json', 'next.config.js'])
    expect(p.name).toBe('web-app') // scoped name's last segment
    expect(p.primaryLanguage).toBe('typescript')
    expect(p.packageManager).toBe('npm')
    expect(p.type).toBe('app')
    expect(p.frameworks).toContain('Next.js')
    expect(p.stack.map((s) => s.name)).toContain('Prisma')
    expect(p.scripts.find((s) => s.name === 'dev')?.kind).toBe('dev')
  })

  it('classifies a Go module and derives its name', async () => {
    const p = await analyzeProject(join(root, 'go-svc'), ['go.mod'])
    expect(p.primaryLanguage).toBe('go')
    expect(p.packageManager).toBe('go')
    expect(p.name).toBe('billing')
    expect(p.scripts.find((s) => s.name === 'run')?.runner).toBe('go')
  })
})
