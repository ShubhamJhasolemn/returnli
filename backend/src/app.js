import cors from 'cors'
import express from 'express'
import { ordersRouter } from './routes/orders.js'
import { requestsRouter } from './routes/requests.js'

import { errorHandler, notFound } from './lib/errors.js'

// Builds the Express app WITHOUT starting it, so tests can import it directly.
export function createApp() {
  const app = express()

  app.use(express.json()) // parse JSON request bodies into req.body
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }))

  // Health check — confirms the server is up (handy for uptime checks / Render).
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  
  // --- routes ---
   // app.use('/api/orders', ordersRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/requests', requestsRouter)

  // Any unmatched route -> 404 in our standard envelope.
  app.use((req, res, next) => {
    next(notFound(`Route ${req.method} ${req.path} not found.`))
  })

  // Error handler LAST, so everything above can forward errors to it.
  app.use(errorHandler)

  return app
}