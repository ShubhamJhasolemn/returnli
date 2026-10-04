import { z } from 'zod'

import { STATUSES } from '../domain/status.js'

export const REASONS = ['damaged', 'wrong_item', 'size_issue', 'not_as_described', 'changed_mind']

export const createRequestSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  orderItemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  reason: z.enum(REASONS),
})

export const listRequestsSchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  reason: z.enum(REASONS).optional(),
  sort: z.enum(['created_at', 'updated_at', 'reference', 'status']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})