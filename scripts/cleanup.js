import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await pool.query('DELETE FROM admins WHERE email <> $1', ['ihtiartiar081@gmail.com']);
const res = await pool.query('SELECT id, email, role, is_active FROM admins');
console.log('Admins in DB:', res.rows);
await pool.end();

