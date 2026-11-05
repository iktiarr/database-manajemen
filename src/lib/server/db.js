import pg from 'pg';
import { env } from '$env/dynamic/private';

const { Pool } = pg;

/**
 * Cache pool koneksi per nama database agar tidak membuat instance baru di setiap request.
 * @type {Map<string, pg.Pool>}
 */
const poolCache = new Map();

/**
 * Pool koneksi PostgreSQL admin untuk operasi tingkat server (misalnya: CREATE DATABASE).
 * Menghubungkan ke database default/admin (misal: 'postgres').
 */
export const adminPool = new Pool({
	connectionString: env.ADMIN_DATABASE_URL || process.env.ADMIN_DATABASE_URL || env.DATABASE_BASE_URL || process.env.DATABASE_BASE_URL,
	max: 5,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 10000
});

adminPool.on('error', (err) => {
	console.error('Unexpected error on idle admin PostgreSQL client:', err);
});

/**
 * Mengambil atau membuat pool koneksi ke database target secara dinamis.
 * @param {string} dbName - Nama database PostgreSQL tujuan
 * @returns {pg.Pool} Instance pool untuk database tersebut
 */
export function getTargetPool(dbName) {
	if (!dbName) {
		throw new Error('Database name is required');
	}

	// Cek apakah pool sudah ada di cache
	if (poolCache.has(dbName)) {
		return poolCache.get(dbName);
	}

	const rawBaseUrl =
		env.DATABASE_BASE_URL ||
		process.env.DATABASE_BASE_URL ||
		env.ADMIN_DATABASE_URL ||
		process.env.ADMIN_DATABASE_URL;
	if (!rawBaseUrl) {
		throw new Error('DATABASE_BASE_URL or ADMIN_DATABASE_URL is not defined in environment variables');
	}

	// Ganti / sesuaikan path database pada URL target
	const targetUrl = new URL(rawBaseUrl);
	targetUrl.pathname = `/${dbName}`;

	const pool = new Pool({
		connectionString: targetUrl.toString(),
		max: 10,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 10000
	});

	pool.on('error', (err) => {
		console.error(`Unexpected error on idle PostgreSQL client for database "${dbName}":`, err);
	});

	poolCache.set(dbName, pool);
	return pool;
}

/**
 * Menutup dan menghapus pool koneksi dari cache jika ada.
 * @param {string} dbName
 */
export async function closeTargetPool(dbName) {
	if (poolCache.has(dbName)) {
		try {
			const pool = poolCache.get(dbName);
			await pool.end();
		} catch (err) {
			console.error(`Error ending pool for ${dbName}:`, err);
		}
		poolCache.delete(dbName);
	}
}
