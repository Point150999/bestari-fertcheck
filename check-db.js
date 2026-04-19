require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const r = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    console.log('Tables found:', r.rows.length);
    r.rows.forEach(t => console.log(' -', t.tablename));
  } catch(e) {
    console.error('Error:', e.message);
  }
  pool.end();
}
check();
