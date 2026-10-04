import { badRequest } from './errors.js'

// Validate `data` against a Zod schema. On failure, throw our standard 400
// AppError carrying field-level details. On success, return the parsed data.
export function validate(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw badRequest('Invalid request data.', result.error.flatten())
  }
  return result.data
}