// Every *expected* failure in the app is an AppError. It carries:
//   status  - the HTTP status code to send
//   code    - a stable, machine-readable string the frontend can switch on
//   message - a human-readable explanation
//   details - optional extra context (e.g. which transition was attempted)
export class AppError extends Error {
    constructor(code, message, status, details = undefined) {
      super(message)
      this.name = 'AppError'
      this.code = code
      this.status = status
      this.details = details
    }
  }
  
  // Factory helpers so call sites stay short and every error of a kind looks identical.
  export const badRequest   = (message, details) => new AppError('VALIDATION_ERROR', message, 400, details)
  export const unprocessable = (message, details) => new AppError('UNPROCESSABLE', message, 422, details)
  export const notFound     = (message = 'Resource not found.', details) => new AppError('NOT_FOUND', message, 404, details)
  // All our state-conflict errors are 409 but with different codes, so this takes the code.
  export const conflict     = (code, message, details) => new AppError(code, message, 409, details)


// Express error-handling middleware. Express identifies it by its FOUR args,
// so `next` must stay in the signature even though it's unused.
// Must be registered LAST, after all routes.
export function errorHandler(err, req, res, next) {
    // Map our DB-level duplicate guard (Rule 3) to a clean 409.
    if (err?.code === '23505' && err.constraint === 'one_live_request_per_item') {
      err = conflict('DUPLICATE_LIVE_REQUEST', 'A live return request already exists for this order item.')
    }
    // Malformed JSON body (thrown by express.json()) is a client error, not a
    // server fault — report 400 instead of falling through to the generic 500.
    if (err?.type === 'entity.parse.failed') {
        return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON.' },
        })
    }
    // Our own expected errors: respond in the standard envelope.
    if (err instanceof AppError) {
      return res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      })
    }
  
    // Anything else is unexpected: log it, return a generic 500 (never leak internals).
    console.error('Unexpected error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } })
  }