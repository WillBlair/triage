import { describe, expect, it } from 'vitest'
import { escapeHtml, isSafeHttpUrl } from './htmlEscape.js'

describe('htmlEscape', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
    expect(escapeHtml(`a & b's "q"`)).toBe('a &amp; b&#39;s &quot;q&quot;')
  })

  it('accepts only http(s) URLs for intake links', () => {
    expect(isSafeHttpUrl('https://example.com/intake#tok')).toBe(true)
    expect(isSafeHttpUrl('http://localhost:5173/i/x')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,hi')).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
  })
})
