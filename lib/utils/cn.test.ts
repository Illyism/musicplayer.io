import { describe, expect, it } from 'bun:test'
import { cn } from './cn'

describe('cn', () => {
  it('ignores falsy inputs', () => {
    const includeB = false as boolean
    expect(cn('a', includeB && 'b', 'c')).toBe('a c')
  })

  it('deduplicates conflicting Tailwind classes keeping the last', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
