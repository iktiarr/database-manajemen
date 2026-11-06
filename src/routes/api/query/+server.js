import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getTargetPool } from '#lib/server/db.js';

/**
 * Universal Database Gateway endpoint (POST)
 * Menjalankan query SQL ke database target dengan otorisasi Master API Key
 */
export async function POST({ request }) {
	// 1. Validasi Master API Key
	const authHeader = request.headers.get('authorization');
	const masterKey = env.APP_MASTER_KEY || process.env.APP_MASTER_KEY;

	if (!masterKey || !authHeader || authHeader !== `Bearer ${masterKey}`) {
		return json({ error: 'Tidak diizinkan: Master API Key tidak ditemukan atau tidak valid' }, { status: 401 });
	}

	// 2. Validasi header database target
	const dbName = request.headers.get('x-database-name');
	if (!dbName || !/^[a-zA-Z0-9_]+$/.test(dbName)) {
		return json(
			{
				error: 'Permintaan tidak valid: Header "x-database-name" wajib diisi dan hanya boleh berupa huruf, angka, serta underscore'
			},
			{ status: 400 }
		);
	}

	// 3. Parse JSON body: { sql, params }
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Permintaan tidak valid: Format JSON tidak valid' }, { status: 400 });
	}

	const { sql, params = [] } = body || {};

	if (!sql || typeof sql !== 'string' || !sql.trim()) {
		return json({ error: 'Permintaan tidak valid: String query "sql" wajib diisi' }, { status: 400 });
	}

	if (!Array.isArray(params)) {
		return json({ error: 'Permintaan tidak valid: "params" harus berupa array' }, { status: 400 });
	}

	// 4. Eksekusi query ke database target via dynamic connection pool
	try {
		const pool = getTargetPool(dbName);
		const result = await pool.query(sql, params);

		return json(
			{
				rows: result.rows ?? [],
				rowCount: result.rowCount ?? 0
			},
			{ status: 200 }
		);
	} catch (err) {
		console.error(`Query error on database "${dbName}":`, err);
		return json(
			{
				error: err.message || 'Eksekusi query database gagal'
			},
			{ status: 500 }
		);
	}
}
