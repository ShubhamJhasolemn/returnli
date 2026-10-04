import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { pool } from './pool.js'

// __dirname doesn't exist in ES modules — reconstruct it from this file's URL.
const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const sql = await readFile(join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(sql) // node-postgres runs multi-statement SQL in one call
  console.log('✅ Migration complete — schema applied.')
}

migrate()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end()) // close connections so the process exits