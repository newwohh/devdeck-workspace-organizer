import { describe, expect, it } from 'vitest'
import { isFrameworkAllowed } from './frameworks'

describe('isFrameworkAllowed', () => {
  it('allows projects with a permitted framework', () => {
    expect(isFrameworkAllowed(['Next.js', 'React'])).toBe(true)
    expect(isFrameworkAllowed(['Express'])).toBe(true)
    expect(isFrameworkAllowed(['Astro'])).toBe(true)
    expect(isFrameworkAllowed(['Express', 'Shopify App'])).toBe(true)
  })

  it('rejects projects without a permitted framework', () => {
    expect(isFrameworkAllowed([])).toBe(false)
    expect(isFrameworkAllowed(['Shopify App'])).toBe(false)
    expect(isFrameworkAllowed(['NestJS', 'Vue'])).toBe(false)
    expect(isFrameworkAllowed(['Django'])).toBe(false)
  })
})
