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