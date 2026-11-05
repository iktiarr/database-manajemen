import pg from 'pg';
import crypto from 'node:crypto';

function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString('hex');
	const hash = crypto.scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
	console.error('DATABASE_URL or ADMIN_DATABASE_URL missing.');
	process.exit(1);
}

const pool = new pg.Pool({ connectionString });

try {
	console.log('Connecting to Neon PostgreSQL...');
	await pool.query(`
		CREATE TABLE IF NOT EXISTS admins (
			id SERIAL PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			role VARCHAR(50) DEFAULT 'admin',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`);
	console.log('✓ Table "admins" ensured.');

	const email = 'ihtiartiar081@gmail.com';
	const check = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
	if (check.rows.length === 0) {
		const pwHash = hashPassword('adminadmin123');
		await pool.query('INSERT INTO admins (email, password_hash, role) VALUES ($1, $2, $3)', [
			email,
			pwHash,
			'superadmin'
		]);
		console.log('✓ Successfully seeded admin account:', email);
	} else {
		console.log('✓ Admin account already exists:', email);
	}

	const list = await pool.query('SELECT id, email, role, created_at FROM admins');
	console.log('Current Master Admins in Neon:', list.rows);
} catch (err) {
	console.error('Error during setup:', err);
} finally {
	await pool.end();
}

