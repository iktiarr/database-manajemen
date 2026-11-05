import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getTargetPool, adminPool } from '#lib/server/db.js';

function isAuthorized(event) {
	if (event.locals.admin) return true;
	const authHeader = event.request.headers.get('authorization');
	const masterKey = env.APP_MASTER_KEY || process.env.APP_MASTER_KEY;
	if (masterKey && authHeader === `Bearer ${masterKey}`) return true;
	return false;
}

function isValidIdentifier(name) {
	return typeof name === 'string' && /^[a-zA-Z0-9_]+$/.test(name.trim());
}

/**
 * GET /api/studio?db=<dbName>&table=<tableName>
 */
export async function GET(event) {
	if (!isAuthorized(event)) {
		return json({ error: 'Unauthorized: Harap login atau sediakan Master API Key' }, { status: 401 });
	}

	const dbName = event.url.searchParams.get('db')?.trim();
	const tableName = event.url.searchParams.get('table')?.trim();

	if (!dbName || !isValidIdentifier(dbName)) {
		return json({ error: 'Parameter "db" tidak valid atau kosong' }, { status: 400 });
	}

	try {
		const pool = getTargetPool(dbName);

		// Jika nama tabel tidak diberikan, kembalikan daftar semua tabel public
		if (!tableName) {
			const tablesRes = await pool.query(`
				SELECT table_name
				FROM information_schema.tables
				WHERE table_schema = 'public'
				  AND table_type = 'BASE TABLE'
				ORDER BY table_name ASC
			`);

			// Ambil jumlah baris untuk setiap tabel
			const tablesWithCount = await Promise.all(
				tablesRes.rows.map(async (row) => {
					try {
						const countRes = await pool.query(`SELECT count(*)::int as count FROM "${row.table_name}"`);
						return {
							name: row.table_name,
							rowCount: countRes.rows[0]?.count ?? 0
						};
					} catch {
						return {
							name: row.table_name,
							rowCount: 0
						};
					}
				})
			);

			return json({
				success: true,
				dbName,
				tables: tablesWithCount
			});
		}

		// Jika nama tabel diberikan, kembalikan skema kolom dan isi baris data
		if (!isValidIdentifier(tableName)) {
			return json({ error: 'Parameter "table" tidak valid' }, { status: 400 });
		}

		// 1. Kolom
		const columnsRes = await pool.query(`
			SELECT 
				column_name,
				data_type,
				udt_name,
				is_nullable,
				column_default
			FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND table_name = $1
			ORDER BY ordinal_position ASC
		`, [tableName]);

		// 2. Primary Key
		const pkRes = await pool.query(`
			SELECT kcu.column_name
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage kcu
			  ON tc.constraint_name = kcu.constraint_name
			  AND tc.table_schema = kcu.table_schema
			WHERE tc.constraint_type = 'PRIMARY KEY'
			  AND tc.table_schema = 'public'
			  AND tc.table_name = $1
		`, [tableName]);

		const primaryKey = pkRes.rows[0]?.column_name || null;

		const columns = columnsRes.rows.map((c) => ({
			name: c.column_name,
			type: c.data_type === 'USER-DEFINED' ? c.udt_name : c.data_type,
			nullable: c.is_nullable === 'YES',
			defaultValue: c.column_default,
			isPrimary: c.column_name === primaryKey
		}));

		// 3. Ambil data baris
		const dataRes = await pool.query(`SELECT * FROM "${tableName}" LIMIT 100`);
		const totalRes = await pool.query(`SELECT count(*)::int as count FROM "${tableName}"`);

		return json({
			success: true,
			dbName,
			tableName,
			columns,
			primaryKey,
			rows: dataRes.rows,
			totalCount: totalRes.rows[0]?.count ?? dataRes.rows.length
		});
	} catch (err) {
		console.error(`Error in /api/studio GET (db: ${dbName}, table: ${tableName}):`, err);
		return json({ error: err.message || 'Gagal mengambil data dari database' }, { status: 500 });
	}
}

/**
 * POST /api/studio
 * Actions: createTable, dropTable, addColumn, insertRow, deleteRow
 */
export async function POST(event) {
	if (!isAuthorized(event)) {
		return json({ error: 'Unauthorized: Harap login atau sediakan Master API Key' }, { status: 401 });
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Format JSON request tidak valid' }, { status: 400 });
	}

	const { action, dbName, tableName } = body || {};

	if (!dbName || !isValidIdentifier(dbName)) {
		return json({ error: 'Parameter "dbName" tidak valid atau kosong' }, { status: 400 });
	}

	try {
		const pool = getTargetPool(dbName);

		// Action: Buat Tabel Baru
		if (action === 'createTable') {
			if (!tableName || !isValidIdentifier(tableName)) {
				return json({ error: 'Nama tabel hanya boleh berupa huruf, angka, dan underscore' }, { status: 400 });
			}

			const columns = Array.isArray(body.columns) ? body.columns : [];
			const colDefs = ['id SERIAL PRIMARY KEY'];

			for (const col of columns) {
				const colName = col.name?.trim();
				if (!colName || !isValidIdentifier(colName) || colName.toLowerCase() === 'id') continue;

				const colType = (col.type || 'VARCHAR(255)').toUpperCase();
				// Validasi tipe kolom yang diizinkan
				const allowedTypes = [
					'VARCHAR(255)', 'VARCHAR(100)', 'TEXT', 'INTEGER', 'BIGINT',
					'BOOLEAN', 'TIMESTAMP WITH TIME ZONE', 'NUMERIC', 'JSONB', 'DATE'
				];
				const sanitizedType = allowedTypes.includes(colType) ? colType : 'VARCHAR(255)';
				const nullClause = col.nullable ? '' : ' NOT NULL';
				const defaultClause = col.defaultValue ? ` DEFAULT '${col.defaultValue.replace(/'/g, "''")}'` : '';

				colDefs.push(`"${colName}" ${sanitizedType}${nullClause}${defaultClause}`);
			}

			// Tambahkan kolom created_at jika belum ada
			if (!columns.some((c) => c.name?.toLowerCase() === 'created_at')) {
				colDefs.push('created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
			}

			const createSql = `CREATE TABLE "${tableName}" (\n  ${colDefs.join(',\n  ')}\n);`;
			await pool.query(createSql);

			return json({
				success: true,
				message: `Tabel "${tableName}" berhasil dibuat di database "${dbName}"!`
			});
		}

		// Action: Hapus Tabel (Drop Table)
		if (action === 'dropTable') {
			if (!tableName || !isValidIdentifier(tableName)) {
				return json({ error: 'Nama tabel tidak valid' }, { status: 400 });
			}

			await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
			return json({
				success: true,
				message: `Tabel "${tableName}" berhasil dihapus dari database "${dbName}".`
			});
		}

		// Action: Tambah Kolom Baru (Add Column)
		if (action === 'addColumn') {
			if (!tableName || !isValidIdentifier(tableName)) {
				return json({ error: 'Nama tabel tidak valid' }, { status: 400 });
			}

			const { columnName, columnType = 'VARCHAR(255)', nullable = true, defaultValue = '' } = body;
			if (!columnName || !isValidIdentifier(columnName)) {
				return json({ error: 'Nama kolom hanya boleh huruf, angka, dan underscore' }, { status: 400 });
			}

			const allowedTypes = [
				'VARCHAR(255)', 'VARCHAR(100)', 'TEXT', 'INTEGER', 'BIGINT',
				'BOOLEAN', 'TIMESTAMP WITH TIME ZONE', 'NUMERIC', 'JSONB', 'DATE'
			];
			const sanitizedType = allowedTypes.includes(columnType.toUpperCase())
				? columnType.toUpperCase()
				: 'VARCHAR(255)';

			let alterSql = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${sanitizedType}`;
			if (!nullable && defaultValue) {
				alterSql += ` NOT NULL DEFAULT '${defaultValue.replace(/'/g, "''")}'`;
			} else if (defaultValue) {
				alterSql += ` DEFAULT '${defaultValue.replace(/'/g, "''")}'`;
			}

			await pool.query(alterSql);
			return json({
				success: true,
				message: `Kolom "${columnName}" (${sanitizedType}) berhasil ditambahkan ke tabel "${tableName}"!`
			});
		}

		// Action: Tambah Baris Data (Insert Row)
		if (action === 'insertRow') {
			if (!tableName || !isValidIdentifier(tableName)) {
				return json({ error: 'Nama tabel tidak valid' }, { status: 400 });
			}

			const { rowData } = body;
			if (!rowData || typeof rowData !== 'object') {
				return json({ error: 'Data baris tidak boleh kosong' }, { status: 400 });
			}

			const validCols = [];
			const values = [];
			const placeholders = [];

			let pIdx = 1;
			for (const [key, val] of Object.entries(rowData)) {
				if (!isValidIdentifier(key)) continue;
				// Jika field id bernilai kosong/undefined, lewati agar menggunakan SERIAL autoincrement
				if (key.toLowerCase() === 'id' && (val === '' || val === null || val === undefined)) continue;

				validCols.push(`"${key}"`);
				// Parse boolean or empty string to null if appropriate
				let parsedVal = val;
				if (val === '') parsedVal = null;
				values.push(parsedVal);
				placeholders.push(`$${pIdx++}`);
			}

			if (validCols.length === 0) {
				return json({ error: 'Tidak ada kolom yang diisi untuk dimasukkan' }, { status: 400 });
			}

			const insertSql = `INSERT INTO "${tableName}" (${validCols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *;`;
			const insertRes = await pool.query(insertSql, values);

			return json({
				success: true,
				inserted: insertRes.rows[0],
				message: 'Baris data baru berhasil disimpan!'
			});
		}

		// Action: Hapus Baris Data (Delete Row)
		if (action === 'deleteRow') {
			if (!tableName || !isValidIdentifier(tableName)) {
				return json({ error: 'Nama tabel tidak valid' }, { status: 400 });
			}

			const { pkColumn = 'id', pkValue } = body;
			if (!isValidIdentifier(pkColumn) || pkValue === undefined || pkValue === null) {
				return json({ error: 'Identifier baris tidak valid' }, { status: 400 });
			}

			await pool.query(`DELETE FROM "${tableName}" WHERE "${pkColumn}" = $1`, [pkValue]);
			return json({
				success: true,
				message: 'Baris data berhasil dihapus!'
			});
		}

		return json({ error: `Aksi "${action}" tidak dikenali` }, { status: 400 });
	} catch (err) {
		console.error(`Error in /api/studio POST (db: ${dbName}, action: ${action}):`, err);
		return json({ error: err.message || 'Terjadi kesalahan pada operasi studio database' }, { status: 500 });
	}
}

