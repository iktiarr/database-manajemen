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
 * Menghubungkan ke database default/admin (misal: 'postgres' atau 'neondb').
 */
export const adminPool = new Pool({
	connectionString: env.ADMIN_DATABASE_URL || process.env.ADMIN_DATABASE_URL || env.DATABASE_BASE_URL || process.env.DATABASE_BASE_URL,
	max: 2,
	idleTimeoutMillis: 10000,
	connectionTimeoutMillis: 5000
});

adminPool.on('error', (err) => {
	console.error('Unexpected error on idle admin PostgreSQL client:', err);
});

/**
 * Mengambil atau membuat pool koneksi ke database target secara dinamis.
 * Mengutamakan Connection Pooler (-pooler) untuk menghemat RAM Neon dan memaksimalkan throughput serverless.
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

	// Utamakan DATABASE_URL (dengan connection pooler) untuk efisiensi serverless & Neon
	const rawBaseUrl =
		env.DATABASE_URL ||
		process.env.DATABASE_URL ||
		env.DATABASE_BASE_URL ||
		process.env.DATABASE_BASE_URL ||
		env.ADMIN_DATABASE_URL ||
		process.env.ADMIN_DATABASE_URL;

	if (!rawBaseUrl) {
		throw new Error('DATABASE_URL or DATABASE_BASE_URL is not defined in environment variables');
	}

	// Ganti / sesuaikan path database pada URL target
	const targetUrl = new URL(rawBaseUrl);
	targetUrl.pathname = `/${dbName}`;

	const pool = new Pool({
		connectionString: targetUrl.toString(),
		max: 3, // Batasi jumlah koneksi per instans serverless agar Neon compute tidak overload
		idleTimeoutMillis: 10000, // Lepaskan koneksi idle dalam 10 detik agar Neon bisa auto-suspend saat sepi
		connectionTimeoutMillis: 5000
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
