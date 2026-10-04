// Express doesn't catch errors thrown inside async handlers on its own.
// This wrapper runs your async handler and forwards any rejection to next(),
// so it reaches the error middleware instead of crashing the process.
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)