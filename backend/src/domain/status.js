import { conflict } from '../lib/errors.js'

// The ONLY legal transitions. This object is the single source of truth for Rule 1.
export const TRANSITIONS = {
  open:      ['in_review'],
  in_review: ['approved', 'rejected'],
  approved:  ['completed'],
  rejected:  [], // terminal
  completed: [], // terminal
}

export const STATUSES = Object.keys(TRANSITIONS)

// Pure predicate: is this move allowed? (true/false, no throwing)
export function canTransition(from, to) {
  const allowed = TRANSITIONS[from]
  return Array.isArray(allowed) && allowed.includes(to)
}

// Guard: allow silently, or throw a 409 explaining what was legal.
export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw conflict(
      'INVALID_TRANSITION',
      `Cannot move a request from "${from}" to "${to}".`,
      { from, to, allowed: TRANSITIONS[from] ?? [] },
    )
  }
}