import express from 'express'

import { asyncHandler } from '../lib/asyncHandler.js'
import { pool } from '../db/pool.js'

export const statsRouter = express.Router()

// GET /api/stats — overview numbers for the dashboard (all computed in SQL).
statsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [statusRes, reasonRes, refundRes, recentRes] = await Promise.all([
      pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM return_requests WHERE removed_at IS NULL GROUP BY status`,
      ),
      pool.query(
        `SELECT reason, COUNT(*)::int AS count
         FROM return_requests WHERE removed_at IS NULL GROUP BY reason`,
      ),
      pool.query(
        `SELECT COALESCE(SUM(refund_amount), 0)::float AS total
         FROM return_requests WHERE removed_at IS NULL AND resolution = 'refund'`,
      ),
      pool.query(
        `SELECT r.id, r.reference, r.status, r.reason, r.created_at,
                c.name AS customer_name, o.reference AS order_reference
         FROM return_requests r
         JOIN orders o    ON o.id = r.order_id
         JOIN customers c ON c.id = o.customer_id
         WHERE r.removed_at IS NULL
         ORDER BY r.created_at DESC
         LIMIT 5`,
      ),
    ])

    const statusCounts = { open: 0, in_review: 0, approved: 0, rejected: 0, completed: 0 }
    for (const row of statusRes.rows) statusCounts[row.status] = row.count

    const reasonCounts = { damaged: 0, wrong_item: 0, size_issue: 0, not_as_described: 0, changed_mind: 0 }
    for (const row of reasonRes.rows) reasonCounts[row.reason] = row.count

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0)
    const needsAttention = statusCounts.open + statusCounts.in_review

    res.json({
      data: {
        total,
        needsAttention,
        refundTotal: refundRes.rows[0].total,
        statusCounts,
        reasonCounts,
        recent: recentRes.rows.map((r) => ({
          id: r.id,
          reference: r.reference,
          status: r.status,
          reason: r.reason,
          createdAt: r.created_at,
          customerName: r.customer_name,
          orderReference: r.order_reference,
        })),
      },
    })
  }),
)