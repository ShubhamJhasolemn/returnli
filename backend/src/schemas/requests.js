import { z } from 'zod'

// Shape + rules for the POST /api/requests body. Zod validates STRUCTURE
// (types, allowed values); business rules live in the domain layer.
export const createRequestSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  orderItemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  reason: z.enum(['damaged', 'wrong_item', 'size_issue', 'not_as_described', 'changed_mind']),
})