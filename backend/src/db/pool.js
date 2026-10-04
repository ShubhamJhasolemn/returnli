import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  // Fail loud: don't let the app start pretending it has a DB if env itself is not set. 
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
}

// A Pool keeps a small set of reusable connections. Here we're creating exactly ONE
// and importing it everywhere. Creating pools per request would exhaust the DB.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase enforces TLS. We're not using it, so we'll allow it.
  // We skip verification because we’re not pinning Supabase’s CA cert for this project.
})