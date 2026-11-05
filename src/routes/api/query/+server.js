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
		return json({ error: 'Unauthorized: Missing or invalid Master API Key' }, { status: 401 });
	}

	// 2. Validasi header database target
	const dbName = request.headers.get('x-database-name');
	if (!dbName || !/^[a-zA-Z0-9_]+$/.test(dbName)) {
		return json(
			{
				error: 'Bad Request: "x-database-name" header is required and must only contain alphanumeric characters and underscores'
			},
			{ status: 400 }
		);
	}

	// 3. Parse JSON body: { sql, params }
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad Request: Invalid JSON body' }, { status: 400 });
	}

	const { sql, params = [] } = body || {};

	if (!sql || typeof sql !== 'string' || !sql.trim()) {
		return json({ error: 'Bad Request: "sql" query string is required' }, { status: 400 });
	}

	if (!Array.isArray(params)) {
		return json({ error: 'Bad Request: "params" must be an array' }, { status: 400 });
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
				error: err.message || 'Database query failed'
			},
			{ status: 500 }
		);
	}
}
