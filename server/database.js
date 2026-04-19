require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Convert ? placeholders to $1, $2, $3... for PostgreSQL
function convertParams(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

const db = {
  // Get single row
  async get(sql, params = []) {
    const { rows } = await pool.query(convertParams(sql), params);
    return rows[0] || null;
  },

  // Get all rows
  async all(sql, params = []) {
    const { rows } = await pool.query(convertParams(sql), params);
    return rows;
  },

  // Run INSERT/UPDATE/DELETE - auto-adds RETURNING id for INSERTs
  async run(sql, params = []) {
    const converted = convertParams(sql);
    const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
    const hasReturning = sql.toUpperCase().includes('RETURNING');
    const finalSql = (isInsert && !hasReturning) ? converted + ' RETURNING id' : converted;
    const result = await pool.query(finalSql, params);
    return {
      id: result.rows?.[0]?.id,
      rowCount: result.rowCount,
      lastInsertRowid: result.rows?.[0]?.id // backward compat
    };
  },

  // Execute raw SQL (for schema creation)
  async exec(sql) {
    await pool.query(sql);
  },

  // Transaction helper
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Create a scoped db for this transaction
      const txDb = {
        async get(sql, params = []) {
          const { rows } = await client.query(convertParams(sql), params);
          return rows[0] || null;
        },
        async all(sql, params = []) {
          const { rows } = await client.query(convertParams(sql), params);
          return rows;
        },
        async run(sql, params = []) {
          const converted = convertParams(sql);
          const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
          const hasReturning = sql.toUpperCase().includes('RETURNING');
          const finalSql = (isInsert && !hasReturning) ? converted + ' RETURNING id' : converted;
          const result = await client.query(finalSql, params);
          return { id: result.rows?.[0]?.id, rowCount: result.rowCount };
        }
      };
      await fn(txDb);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  pool // expose pool for direct access if needed
};

// Initialize: seed admin if not exists
async function initDb() {
  try {
    const admin = await db.get("SELECT id FROM users WHERE email = 'admin@fertcheck.com'");
    if (!admin) {
      const hash = bcrypt.hashSync('admin123', 10);
      await db.run(
        'INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Administrator', 'admin@fertcheck.com', hash, 'admin']
      );
      console.log('✅ Admin account seeded: admin@fertcheck.com / admin123');
    }
  } catch (err) {
    console.error('⚠️ DB init error (run supabase-schema.sql first):', err.message);
  }
}

initDb();

module.exports = db;
