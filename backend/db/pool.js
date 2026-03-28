import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('💥 Unexpected error on idle client', err);
});

/**
 * Execute a query
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('✓ Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res.rows;
  } catch (error) {
    console.error('💥 Database error:', error);
    throw error;
  }
}

/**
 * Get a client connection
 */
export async function getClient() {
  return pool.connect();
}

/**
 * Close the pool
 */
export async function closePool() {
  await pool.end();
}

export default pool;
