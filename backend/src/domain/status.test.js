import { describe, expect, it } from 'vitest'

import { TRANSITIONS, assertTransition, canTransition } from './status.js'

describe('status transitions (Rule 1)', () => {
  it('allows the legal path', () => {
    expect(canTransition('open', 'in_review')).toBe(true)
    expect(canTransition('in_review', 'approved')).toBe(true)
    expect(canTransition('in_review', 'rejected')).toBe(true)
    expect(canTransition('approved', 'completed')).toBe(true)
  })

  it('forbids skipping steps', () => {
    expect(canTransition('open', 'approved')).toBe(false)
    expect(canTransition('open', 'completed')).toBe(false)
    expect(canTransition('in_review', 'completed')).toBe(false)
  })

  it('treats rejected and completed as terminal', () => {
    expect(TRANSITIONS.rejected).toEqual([])
    expect(TRANSITIONS.completed).toEqual([])
    expect(canTransition('completed', 'open')).toBe(false)
  })

  it('assertTransition throws a 409 INVALID_TRANSITION on an illegal move', () => {
    expect(() => assertTransition('open', 'completed')).toThrow()
    try {
      assertTransition('open', 'completed')
    } catch (err) {
      expect(err.code).toBe('INVALID_TRANSITION')
      expect(err.status).toBe(409)
    }
  })

  it('assertTransition is silent on a legal move', () => {
    expect(() => assertTransition('open', 'in_review')).not.toThrow()
  })
})