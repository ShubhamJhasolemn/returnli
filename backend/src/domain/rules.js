import { conflict, unprocessable } from '../lib/errors.js'

export const DECIDED_STATUSES = ['approved', 'rejected', 'completed']
export const RESOLUTIONS = ['refund', 'replacement', 'store_credit']

// Rule 4: a request's details can only be edited before it is decided.
export function assertEditable(status) {
  if (DECIDED_STATUSES.includes(status)) {
    throw conflict('LOCKED', `A ${status} request can no longer be edited.`, { status })
  }
}

// Rule 5: only open or rejected requests may be removed.
export function assertRemovable(status) {
  if (status !== 'open' && status !== 'rejected') {
    throw conflict('NOT_REMOVABLE', `A ${status} request cannot be removed.`, { status })
  }
}

// Rule 2: approval needs a valid resolution, and refund<->amount must agree.
// Returns the normalized { resolution, refundAmount } to persist.
export function validateApproval({ resolution, refundAmount }) {
  if (!RESOLUTIONS.includes(resolution)) {
    throw unprocessable(
      'Approving a request requires a resolution of refund, replacement or store_credit.',
      { resolution },
    )
  }
  if (resolution === 'refund') {
    const amount = Number(refundAmount)
    if (refundAmount == null || Number.isNaN(amount) || amount <= 0) {
      throw unprocessable('A refund resolution requires a refund amount greater than zero.', { refundAmount })
    }
    return { resolution, refundAmount: amount.toFixed(2) }
  }
  // Non-refund resolutions must NOT carry an amount.
  if (refundAmount != null) {
    throw unprocessable('A refund amount may only be set when the resolution is refund.', { resolution, refundAmount })
  }
  return { resolution, refundAmount: null }
}