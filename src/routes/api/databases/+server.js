import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminPool, closeTargetPool } from '#lib/server/db.js';

/**
 * Endpoint GET untuk mendapatkan daftar database
 */
export async function GET({ request, locals }) {
	const authHeader = request.headers.get('authorization');
	const masterKey = env.APP_MASTER_KEY || process.env.APP_MASTER_KEY;
	const isMasterKeyValid = masterKey && authHeader === `Bearer ${masterKey}`;

	if (!locals.admin && !isMasterKeyValid) {
		return json({ error: 'Unauthorized: Harap login atau sediakan Master API Key' }, { status: 401 });
	}

	try {
		const res = await adminPool.query(`
			SELECT datname as name,
			       pg_size_pretty(pg_database_size(datname)) as size,
			       pg_encoding_to_char(encoding) as encoding
			FROM pg_database
			WHERE datistemplate = false
			  AND datname NOT IN ('postgres', 'neondb')
			ORDER BY datname ASC
		`);
		return json({ databases: res.rows }, { status: 200 });
	} catch (err) {
		console.error('List databases error:', err);
		return json({ error: err.message || 'Failed to list databases' }, { status: 500 });
	}
}

/**
 * Endpoint POST untuk membuat database baru
 */
export async function POST({ request, locals }) {
	const authHeader = request.headers.get('authorization');
	const masterKey = env.APP_MASTER_KEY || process.env.APP_MASTER_KEY;
	const isMasterKeyValid = masterKey && authHeader === `Bearer ${masterKey}`;

	if (!locals.admin && !isMasterKeyValid) {
		return json({ error: 'Unauthorized: Harap login atau sediakan Master API Key' }, { status: 401 });
	}

	// 2. Parse request JSON body
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad Request: Invalid JSON body' }, { status: 400 });
	}

	const { dbName } = body || {};

	// 3. Validasi & sanitasi nama database
	if (!dbName || typeof dbName !== 'string' || !/^[a-zA-Z0-9_]+$/.test(dbName)) {
		return json(
			{
				error: 'Bad Request: "dbName" is required and must only contain alphanumeric characters and underscores (/^[a-zA-Z0-9_]+$/)'
			},
			{ status: 400 }
		);
	}

	// 4. Eksekusi query CREATE DATABASE "<dbName>"
	try {
		await adminPool.query(`CREATE DATABASE "${dbName}"`);
		return json(
			{
				success: true,
				message: `Database "${dbName}" created successfully`
			},
			{ status: 200 }
		);
	} catch (err) {
		console.error(`Error creating database "${dbName}":`, err);
		return json(
			{
				error: err.message || 'Failed to create database'
			},
			{ status: 500 }
		);
	}
}

/**
 * Endpoint DELETE untuk menghapus database project
 */
export async function DELETE({ request, locals }) {
	const authHeader = request.headers.get('authorization');
	const masterKey = env.APP_MASTER_KEY || process.env.APP_MASTER_KEY;
	const isMasterKeyValid = masterKey && authHeader === `Bearer ${masterKey}`;

	if (!locals.admin && !isMasterKeyValid) {
		return json({ error: 'Unauthorized: Harap login atau sediakan Master API Key' }, { status: 401 });
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad Request: Invalid JSON body' }, { status: 400 });
	}

	const { dbName } = body || {};

	if (!dbName || typeof dbName !== 'string' || !/^[a-zA-Z0-9_]+$/.test(dbName)) {
		return json({ error: 'Nama database tidak valid' }, { status: 400 });
	}

	if (['postgres', 'neondb', 'template0', 'template1'].includes(dbName.toLowerCase())) {
		return json({ error: 'Database sistem tidak boleh dihapus.' }, { status: 403 });
	}

	try {
		await closeTargetPool(dbName);
		await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
		return json({ success: true, message: `Project "${dbName}" berhasil dihapus.` });
	} catch (err) {
		console.error(`Error deleting database "${dbName}":`, err);
		return json({ error: err.message || 'Gagal menghapus database project' }, { status: 500 });
	}
}
