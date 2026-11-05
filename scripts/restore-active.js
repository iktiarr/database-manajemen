import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await pool.query('UPDATE admins SET is_active = true WHERE email = $1', ['ihtiartiar081@gmail.com']);
const res = await pool.query('SELECT id, email, role, is_active FROM admins');
console.log('Restored Admin status in DB:', res.rows);
await pool.end();

