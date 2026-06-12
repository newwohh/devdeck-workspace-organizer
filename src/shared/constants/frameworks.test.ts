import { describe, expect, it } from 'vitest'
import { DEFAULT_FRAMEWORK_FILTER, isFrameworkAllowed } from './frameworks'

describe('isFrameworkAllowed', () => {
  const filter = DEFAULT_FRAMEWORK_FILTER

  it('allows projects with a permitted framework', () => {
    expect(isFrameworkAllowed(['Next.js', 'React'], filter)).toBe(true)
    expect(isFrameworkAllowed(['Express'], filter)).toBe(true)
    expect(isFrameworkAllowed(['Express', 'Shopify App'], filter)).toBe(true)
  })

  it('rejects projects without a permitted framework', () => {
    expect(isFrameworkAllowed([], filter)).toBe(false)
    expect(isFrameworkAllowed(['Shopify App'], filter)).toBe(false)
    expect(isFrameworkAllowed(['NestJS', 'Vue'], filter)).toBe(false)
  })

  it('allows everything when the filter is disabled', () => {
    const off = { enabled: false, allowed: [] }
    expect(isFrameworkAllowed([], off)).toBe(true)
    expect(isFrameworkAllowed(['Django'], off)).toBe(true)
  })

  it('honors a custom allowed list', () => {
    const custom = { enabled: true, allowed: ['Vue', 'Django'] }
    expect(isFrameworkAllowed(['Vue'], custom)).toBe(true)
    expect(isFrameworkAllowed(['React'], custom)).toBe(false)
  })
})
