import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';
import { adminPool } from '#lib/server/db.js';

const MASTER_KEY = env.APP_MASTER_KEY || process.env.APP_MASTER_KEY || 'default-secret-salt-key';

/**
 * Hash password menggunakan scrypt dengan random salt
 */
export function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString('hex');
	const hash = crypto.scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

/**
 * Verifikasi password dengan stored hash
 */
export function verifyPassword(password, stored) {
	if (!stored || !stored.includes(':')) return false;
	const [salt, key] = stored.split(':');
	const keyBuffer = Buffer.from(key, 'hex');
	const derivedKey = crypto.scryptSync(password, salt, 64);
	return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Buat signed session token (HMAC-SHA256)
 * Format: base64(payload).signature
 */
export function createSessionToken(admin) {
	const payload = JSON.stringify({
		id: admin.id,
		email: admin.email,
		role: admin.role,
		exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 hari
	});
	const b64Payload = Buffer.from(payload).toString('base64url');
	const signature = crypto.createHmac('sha256', MASTER_KEY).update(b64Payload).digest('base64url');
	return `${b64Payload}.${signature}`;
}

/**
 * Verifikasi signed session token
 */
export function verifySessionToken(token) {
	if (!token || typeof token !== 'string') return null;
	const [b64Payload, signature] = token.split('.');
	if (!b64Payload || !signature) return null;

	const expectedSignature = crypto.createHmac('sha256', MASTER_KEY).update(b64Payload).digest('base64url');
	if (signature !== expectedSignature) return null;

	try {
		const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
		if (payload.exp && Date.now() > payload.exp) {
			return null; // Expired
		}
		return payload;
	} catch {
		return null;
	}
}

/**
 * Ambil admin berdasarkan email dari tabel master admins
 */
export async function getAdminByEmail(email) {
	await ensureAdminsTable();
	const res = await adminPool.query('SELECT * FROM admins WHERE LOWER(email) = LOWER($1)', [email]);
	return res.rows[0] || null;
}

/**
 * Ambil semua admin untuk ditampilkan di dashboard
 */
export async function getAllAdmins() {
	await ensureAdminsTable();
	const res = await adminPool.query(
		'SELECT id, email, role, COALESCE(is_active, true) as is_active, created_at FROM admins ORDER BY id ASC'
	);
	return res.rows;
}

/**
 * Pastikan tabel admins ada dan seed default admin jika belum ada
 */
let ensured = false;
export async function ensureAdminsTable() {
	if (ensured) return;

	try {
		await adminPool.query(`
			CREATE TABLE IF NOT EXISTS admins (
				id SERIAL PRIMARY KEY,
				email VARCHAR(255) UNIQUE NOT NULL,
				password_hash VARCHAR(255) NOT NULL,
				role VARCHAR(50) DEFAULT 'admin',
				is_active BOOLEAN DEFAULT true,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			);
			ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
		`);

		const defaultEmail = 'ihtiartiar081@gmail.com';
		const check = await adminPool.query('SELECT id FROM admins WHERE email = $1', [defaultEmail]);
		if (check.rows.length === 0) {
			const pwHash = hashPassword('adminadmin123');
			await adminPool.query('INSERT INTO admins (email, password_hash, role) VALUES ($1, $2, $3)', [
				defaultEmail,
				pwHash,
				'superadmin'
			]);
			console.log('✓ Seeded default admin:', defaultEmail);
		}
		ensured = true;
	} catch (err) {
		console.error('Error ensuring admins table:', err);
	}
}

