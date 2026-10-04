import 'dotenv/config'

import { createApp } from './app.js'
import { pool } from './db/pool.js'

const PORT = process.env.PORT || 4000
const app = createApp()

const server = app.listen(PORT, () => {
  console.log(`🚀 Returnli API listening on http://localhost:${PORT}`)
})

// Graceful shutdown: on Ctrl+C or termination, stop accepting requests and
// close the DB pool before exiting, so nothing is left dangling.
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down...`)
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))