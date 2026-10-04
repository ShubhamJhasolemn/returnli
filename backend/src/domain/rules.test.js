import { describe, expect, it } from 'vitest'

import { assertEditable, assertRemovable, validateApproval } from './rules.js'

describe('assertEditable (Rule 4)', () => {
  it('allows editing before a decision', () => {
    expect(() => assertEditable('open')).not.toThrow()
    expect(() => assertEditable('in_review')).not.toThrow()
  })
  it('blocks editing once decided', () => {
    for (const s of ['approved', 'rejected', 'completed']) {
      expect(() => assertEditable(s)).toThrow()
    }
  })
})

describe('assertRemovable (Rule 5)', () => {
  it('allows removing open or rejected', () => {
    expect(() => assertRemovable('open')).not.toThrow()
    expect(() => assertRemovable('rejected')).not.toThrow()
  })
  it('blocks removing anything else', () => {
    for (const s of ['in_review', 'approved', 'completed']) {
      expect(() => assertRemovable(s)).toThrow()
    }
  })
})

describe('validateApproval (Rule 2)', () => {
  it('accepts refund with a positive amount and normalizes to 2 decimals', () => {
    expect(validateApproval({ resolution: 'refund', refundAmount: 25 }))
      .toEqual({ resolution: 'refund', refundAmount: '25.00' })
  })
  it('rejects refund with zero or missing amount', () => {
    expect(() => validateApproval({ resolution: 'refund', refundAmount: 0 })).toThrow()
    expect(() => validateApproval({ resolution: 'refund', refundAmount: null })).toThrow()
  })
  it('accepts replacement / store_credit with no amount', () => {
    expect(validateApproval({ resolution: 'replacement', refundAmount: null }))
      .toEqual({ resolution: 'replacement', refundAmount: null })
    expect(validateApproval({ resolution: 'store_credit', refundAmount: null }))
      .toEqual({ resolution: 'store_credit', refundAmount: null })
  })
  it('rejects a non-refund resolution that carries an amount', () => {
    expect(() => validateApproval({ resolution: 'replacement', refundAmount: 10 })).toThrow()
  })
  it('rejects an unknown resolution', () => {
    expect(() => validateApproval({ resolution: 'cash', refundAmount: null })).toThrow()
  })
})