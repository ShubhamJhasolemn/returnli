import 'dotenv/config'

import { pool } from './pool.js'

// Deterministic sample data — no randomness, so "run from scratch" always
// produces the same predictable dataset.

const REASONS = ['damaged', 'wrong_item', 'size_issue', 'not_as_described', 'changed_mind']
const STATUSES = ['open', 'in_review', 'approved', 'rejected', 'completed']
const RESOLUTIONS = ['refund', 'replacement', 'store_credit']

const CUSTOMERS = [
  { name: 'Aarav Sharma',   email: 'aarav.sharma@example.com',   phone: '+91 98200 11111' },
  { name: 'Diya Patel',     email: 'diya.patel@example.com',     phone: '+91 98200 22222' },
  { name: 'Kabir Nair',     email: 'kabir.nair@example.com',     phone: '+91 98200 33333' },
  { name: 'Ananya Rao',     email: 'ananya.rao@example.com',     phone: null },
  { name: 'Vivaan Mehta',   email: 'vivaan.mehta@example.com',   phone: '+91 98200 55555' },
  { name: 'Ishita Gupta',   email: 'ishita.gupta@example.com',   phone: '+91 98200 66666' },
  { name: 'Reyansh Khanna', email: 'reyansh.khanna@example.com', phone: null },
  { name: 'Myra Joshi',     email: 'myra.joshi@example.com',     phone: '+91 98200 88888' },
]

const PRODUCTS = [
  { name: 'Classic Cotton T-Shirt', sku: 'APP-TSHIRT-CLS', price: '19.99',  qty: 3 },
  { name: 'Slim Fit Jeans',         sku: 'APP-JEANS-SLM',  price: '49.99',  qty: 2 },
  { name: 'Running Shoes',          sku: 'FOOT-RUN-001',   price: '89.99',  qty: 2 },
  { name: 'Leather Wallet',         sku: 'ACC-WALLET-LTH', price: '34.50',  qty: 1 },
  { name: 'Wireless Earbuds',       sku: 'ELEC-EARBUD-01', price: '129.00', qty: 1 },
  { name: 'Steel Water Bottle',     sku: 'HOME-BOTTLE-SS', price: '24.00',  qty: 4 },
  { name: 'Yoga Mat',               sku: 'FIT-MAT-STD',    price: '39.99',  qty: 1 },
  { name: 'Graphic Hoodie',         sku: 'APP-HOOD-GRPH',  price: '59.99',  qty: 2 },
  { name: 'Desk Lamp',              sku: 'HOME-LAMP-LED',  price: '44.99',  qty: 1 },
  { name: 'Backpack 25L',           sku: 'ACC-BKPK-25L',   price: '69.00',  qty: 1 },
]

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN') // all-or-nothing: a failure rolls the whole seed back

    // Wipe everything so the seed is repeatable. RESTART IDENTITY resets the
    // auto-increment id columns; CASCADE takes care of FK dependencies.
    await client.query(`
      TRUNCATE return_notes, return_requests, order_items, orders, customers
      RESTART IDENTITY CASCADE
    `)
    // The reference sequence is a standalone object TRUNCATE doesn't touch — reset it too,
    // so references start cleanly at RTN-000001 every run.
    await client.query(`ALTER SEQUENCE return_request_ref_seq RESTART WITH 1`)

    // ---- customers ----
    const customerIds = []
    for (const c of CUSTOMERS) {
      const { rows } = await client.query(
        `INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
        [c.name, c.email, c.phone],
      )
      customerIds.push(rows[0].id)
    }

    // ---- orders (round-robin across customers) ----
    const ORDER_COUNT = 14
    const orderIds = []
    for (let i = 0; i < ORDER_COUNT; i++) {
      const reference = `ORD-2026-${String(i + 1).padStart(6, '0')}`
      const customerId = customerIds[i % customerIds.length]
      const { rows } = await client.query(
        `INSERT INTO orders (reference, customer_id) VALUES ($1, $2) RETURNING id`,
        [reference, customerId],
      )
      orderIds.push(rows[0].id)
    }

    // ---- order_items (4 per order, cycling the product catalog) ----
    const items = [] // { id, orderId, unitPrice, qtyOrdered }
    for (let o = 0; o < orderIds.length; o++) {
      for (let k = 0; k < 4; k++) {
        const p = PRODUCTS[(o * 4 + k) % PRODUCTS.length]
        const { rows } = await client.query(
          `INSERT INTO order_items (order_id, product_name, sku, unit_price, quantity_ordered)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [orderIds[o], p.name, p.sku, p.price, p.qty],
        )
        items.push({ id: rows[0].id, orderId: orderIds[o], unitPrice: p.price, qtyOrdered: p.qty })
      }
    }

    // ---- request plan: every (status, reason) pair once (full coverage) + 10 extra ----
    const plan = []
    for (const status of STATUSES) {
      for (const reason of REASONS) plan.push({ status, reason })
    }
    for (let i = 0; i < 10; i++) {
      plan.push({ status: STATUSES[i % 5], reason: REASONS[(i + 2) % 5] })
    }

    const dayMs = 24 * 60 * 60 * 1000
    let itemCursor = 0
    const requestIds = []

    for (let i = 0; i < plan.length; i++) {
      const { status, reason } = plan[i]
      const item = items[itemCursor++] // distinct item per request -> never trips the live-dup index

      // resolution + refund only exist once a request is approved/completed
      let resolution = null
      let refundAmount = null
      if (status === 'approved' || status === 'completed') {
        resolution = RESOLUTIONS[i % RESOLUTIONS.length]
        if (resolution === 'refund') refundAmount = Number(item.unitPrice).toFixed(2) // > 0, satisfies CHECK
      }

      const createdAt = new Date(Date.now() - (plan.length - i) * dayMs) // older rows first
      const decidedAt =
        status === 'approved' || status === 'rejected' || status === 'completed'
          ? new Date(createdAt.getTime() + dayMs)
          : null
      const quantity = Math.min(1 + (i % 2), item.qtyOrdered) // 1 or 2, never over what was ordered

      const { rows } = await client.query(
        `INSERT INTO return_requests
           (order_id, order_item_id, quantity, reason, status, resolution, refund_amount, created_at, updated_at, decided_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
         RETURNING id`,
        [item.orderId, item.id, quantity, reason, status, resolution, refundAmount, createdAt, decidedAt],
      )
      requestIds.push(rows[0].id)
    }

    // ---- demonstrate Rule 3's "once closed, a new request is allowed" ----
    // A spare item gets a COMPLETED (closed) request AND a fresh OPEN one.
    // Both coexist because the completed one is no longer "live".
    const spare = items[itemCursor++]
    const closed = await client.query(
      `INSERT INTO return_requests
         (order_id, order_item_id, quantity, reason, status, resolution, refund_amount, decided_at)
       VALUES ($1, $2, 1, 'damaged', 'completed', 'refund', $3, now()) RETURNING id`,
      [spare.orderId, spare.id, Number(spare.unitPrice).toFixed(2)],
    )
    const reopened = await client.query(
      `INSERT INTO return_requests (order_id, order_item_id, quantity, reason, status)
       VALUES ($1, $2, 1, 'size_issue', 'open') RETURNING id`,
      [spare.orderId, spare.id],
    )
    requestIds.push(closed.rows[0].id, reopened.rows[0].id)

    // ---- notes on a subset (every 3rd request gets 1-2) ----
    const NOTE_BODIES = [
      'Customer contacted support about this return.',
      'Item received and inspected — matches the reported issue.',
      'Awaiting warehouse confirmation before deciding.',
      'Refund processed to original payment method.',
      'Replacement dispatched; tracking shared with customer.',
    ]
    let noteCount = 0
    for (let i = 0; i < requestIds.length; i++) {
      if (i % 3 !== 0) continue
      const howMany = (i % 2) + 1
      for (let n = 0; n < howMany; n++) {
        await client.query(
          `INSERT INTO return_notes (request_id, body, author) VALUES ($1, $2, $3)`,
          [requestIds[i], NOTE_BODIES[(i + n) % NOTE_BODIES.length], 'Agent Bond'],
        )
        noteCount++
      }
    }

    await client.query('COMMIT')
    console.log('✅ Seed complete:')
    console.log(`   ${customerIds.length} customers, ${orderIds.length} orders, ${items.length} order items`)
    console.log(`   ${requestIds.length} return requests (all ${STATUSES.length} statuses & ${REASONS.length} reasons), ${noteCount} notes`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Seed failed, rolled back:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

seed()