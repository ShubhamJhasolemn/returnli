import express from 'express'

import { asyncHandler } from '../lib/asyncHandler.js'
import { pool } from '../db/pool.js'
import { notFound } from '../lib/errors.js'

// A Router is a mini-app: a group of related routes you mount under one path.
export const ordersRouter = express.Router()

// GET /api/orders — all orders with their customer (populates the form's order dropdown).
ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT o.id, o.reference, o.created_at,
              c.id AS customer_id, c.name AS customer_name, c.email AS customer_email
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       ORDER BY o.reference`,
    )

    // Map DB snake_case columns into a clean camelCase API shape.
    const data = rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      createdAt: r.created_at,
      customer: { id: r.customer_id, name: r.customer_name, email: r.customer_email },
    }))

    res.json({ data })
  }),
)

// GET /api/orders/:reference — one order with its customer and its items.
ordersRouter.get(
  '/:reference',
  asyncHandler(async (req, res) => {
    const { reference } = req.params

    const orderResult = await pool.query(
      `SELECT o.id, o.reference, o.created_at,
              c.id AS customer_id, c.name AS customer_name,
              c.email AS customer_email, c.phone AS customer_phone
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.reference = $1`,
      [reference],
    )

    const order = orderResult.rows[0]
    if (!order) {
      throw notFound(`Order "${reference}" not found.`)
    }

    const itemsResult = await pool.query(
      `SELECT id, product_name, sku, unit_price, quantity_ordered
       FROM order_items
       WHERE order_id = $1
       ORDER BY id`,
      [order.id],
    )

    res.json({
      data: {
        id: order.id,
        reference: order.reference,
        createdAt: order.created_at,
        customer: {
          id: order.customer_id,
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
        },
        items: itemsResult.rows.map((i) => ({
          id: i.id,
          productName: i.product_name,
          sku: i.sku,
          unitPrice: i.unit_price,
          quantityOrdered: i.quantity_ordered,
        })),
      },
    })
  }),
)