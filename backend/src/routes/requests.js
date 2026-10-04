import express from 'express'

import { asyncHandler } from '../lib/asyncHandler.js'
import { pool } from '../db/pool.js'
import { notFound, unprocessable } from '../lib/errors.js'
import { validate } from '../lib/validate.js'
import { createRequestSchema, listRequestsSchema } from '../schemas/requests.js'

export const requestsRouter = express.Router()

// Whitelist of sortable columns. Column names and ASC/DESC CANNOT be passed as
// SQL parameters, so they must come from a trusted map — never raw user input.
const SORT_COLUMNS = {
    created_at: 'r.created_at',
    updated_at: 'r.updated_at',
    reference: 'r.reference',
    status: 'r.status',
  }
  
  // GET /api/requests — search + filter + sort + paginate, entirely in SQL.
  requestsRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      const filters = validate(listRequestsSchema, req.query)
  
      // Build the WHERE clause dynamically. VALUES always go through $ params
      // (injection-safe); only the clause STRUCTURE is assembled in JS.
      const where = ['r.removed_at IS NULL'] // never show removed requests
      const params = []
  
      if (filters.status) {
        params.push(filters.status)
        where.push(`r.status = $${params.length}`)
      }
      if (filters.reason) {
        params.push(filters.reason)
        where.push(`r.reason = $${params.length}`)
      }
      if (filters.q) {
        params.push(`%${filters.q}%`)
        const i = params.length
        where.push(
          `(r.reference ILIKE $${i} OR o.reference ILIKE $${i} OR c.name ILIKE $${i} OR c.email ILIKE $${i})`,
        )
      }
      const whereSql = where.join(' AND ')
  
      const sortCol = SORT_COLUMNS[filters.sort] // safe: validated enum -> trusted map
      const sortDir = filters.order === 'asc' ? 'ASC' : 'DESC'
  
      // 1) total matches (same WHERE, no paging) — for pagination metadata.
      const countResult = await pool.query(
        `SELECT COUNT(*) AS total
         FROM return_requests r
         JOIN orders o    ON o.id = r.order_id
         JOIN customers c ON c.id = o.customer_id
         WHERE ${whereSql}`,
        params,
      )
      const total = Number(countResult.rows[0].total)
  
      // 2) the page itself.
      const limit = filters.pageSize
      const offset = (filters.page - 1) * filters.pageSize
      const pageResult = await pool.query(
        `SELECT r.id, r.reference, r.quantity, r.reason, r.status, r.resolution, r.refund_amount,
                r.created_at, r.updated_at,
                o.reference AS order_reference,
                c.name AS customer_name, c.email AS customer_email,
                oi.product_name
         FROM return_requests r
         JOIN orders o       ON o.id = r.order_id
         JOIN customers c    ON c.id = o.customer_id
         JOIN order_items oi ON oi.id = r.order_item_id
         WHERE ${whereSql}
         ORDER BY ${sortCol} ${sortDir}, r.id ${sortDir}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      )
  
      const data = pageResult.rows.map((r) => ({
        id: r.id,
        reference: r.reference,
        status: r.status,
        reason: r.reason,
        quantity: r.quantity,
        resolution: r.resolution,
        refundAmount: r.refund_amount,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        order: { reference: r.order_reference },
        customer: { name: r.customer_name, email: r.customer_email },
        item: { productName: r.product_name },
      }))
  
      res.json({
        data,
        pagination: {
          page: filters.page,
          pageSize: filters.pageSize,
          total,
          totalPages: Math.ceil(total / filters.pageSize),
        },
      })
    }),
  )

// Fetch one request with order + customer + item + notes. Returns null if the
// request doesn't exist or has been removed (removed rows can no longer be fetched).
async function getRequestDetail(idOrRef) {
  const asId = /^\d+$/.test(String(idOrRef)) ? Number(idOrRef) : null

  const { rows } = await pool.query(
    `SELECT r.id, r.reference, r.quantity, r.reason, r.status, r.resolution, r.refund_amount,
            r.created_at, r.updated_at, r.decided_at,
            o.id  AS order_id,  o.reference AS order_reference,
            c.id  AS customer_id, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
            oi.id AS item_id, oi.product_name, oi.sku, oi.unit_price, oi.quantity_ordered
     FROM return_requests r
     JOIN orders o       ON o.id  = r.order_id
     JOIN customers c    ON c.id  = o.customer_id
     JOIN order_items oi ON oi.id = r.order_item_id
     WHERE r.removed_at IS NULL AND (r.reference = $1 OR r.id = $2)`,
    [String(idOrRef), asId],
  )

  const row = rows[0]
  if (!row) return null

  const notes = await pool.query(
    `SELECT id, body, author, created_at
     FROM return_notes
     WHERE request_id = $1
     ORDER BY created_at ASC, id ASC`,
    [row.id],
  )

  return {
    id: row.id,
    reference: row.reference,
    quantity: row.quantity,
    reason: row.reason,
    status: row.status,
    resolution: row.resolution,
    refundAmount: row.refund_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decidedAt: row.decided_at,
    order: { id: row.order_id, reference: row.order_reference },
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    item: {
      id: row.item_id,
      productName: row.product_name,
      sku: row.sku,
      unitPrice: row.unit_price,
      quantityOrdered: row.quantity_ordered,
    },
    notes: notes.rows.map((n) => ({
      id: n.id,
      body: n.body,
      author: n.author,
      createdAt: n.created_at,
    })),
  }
}

// POST /api/requests — raise a new return request.
requestsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = validate(createRequestSchema, req.body)

    // The chosen item must exist AND belong to the given order.
    const itemResult = await pool.query(
      `SELECT id, quantity_ordered FROM order_items WHERE id = $1 AND order_id = $2`,
      [input.orderItemId, input.orderId],
    )
    const item = itemResult.rows[0]
    if (!item) {
      throw unprocessable('The selected item does not belong to the given order.', {
        orderId: input.orderId,
        orderItemId: input.orderItemId,
      })
    }

    // Can't return more units than were ordered.
    if (input.quantity > item.quantity_ordered) {
      throw unprocessable('Return quantity cannot exceed the quantity ordered.', {
        quantity: input.quantity,
        quantityOrdered: item.quantity_ordered,
      })
    }

    // Rule 3 (one live request per item) is enforced by the DB's partial unique
    // index — a duplicate throws pg 23505, mapped to 409 in the error handler.
    const inserted = await pool.query(
      `INSERT INTO return_requests (order_id, order_item_id, quantity, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.orderId, input.orderItemId, input.quantity, input.reason],
    )

    const detail = await getRequestDetail(inserted.rows[0].id)
    res.status(201).json({ data: detail })
  }),
)

// GET /api/requests/:idOrRef — one request with everything, including notes.
requestsRouter.get(
  '/:idOrRef',
  asyncHandler(async (req, res) => {
    const detail = await getRequestDetail(req.params.idOrRef)
    if (!detail) {
      throw notFound(`Return request "${req.params.idOrRef}" not found.`)
    }
    res.json({ data: detail })
  }),
)