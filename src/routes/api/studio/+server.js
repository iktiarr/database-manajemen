import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getTargetPool, adminPool } from '#lib/server/db.js';
import { getOrCreateProjectCredentials, rotateProjectPassword } from '#lib/server/credentials.js';

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
	const mode = event.url.searchParams.get('mode')?.trim();

	if (!dbName || !isValidIdentifier(dbName)) {
		return json({ error: 'Parameter "db" tidak valid atau kosong' }, { status: 400 });
	}

	try {
		const pool = getTargetPool(dbName);

		// Mode cepat khusus realtime sync: hanya mengambil data baris (tanpa kueri katalog skema yang berat)
		if (tableName && mode === 'rowsOnly') {
			if (!isValidIdentifier(tableName)) {
				return json({ error: 'Parameter "table" tidak valid' }, { status: 400 });
			}
			const dataRes = await pool.query(`SELECT * FROM "${tableName}" LIMIT 100`);
			return json({
				success: true,
				dbName,
				tableName,
				rows: dataRes.rows,
				totalCount: dataRes.rows.length
			});
		}

		// Jika nama tabel tidak diberikan, kembalikan daftar semua tabel public dan kredensial role proyek
		if (!tableName) {
			const [tablesRes, credentials] = await Promise.all([
				pool.query(`
					SELECT 
						t.table_name as name,
						COALESCE(s.n_live_tup, 0)::int as "rowCount"
					FROM information_schema.tables t
					LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = 'public'
					WHERE t.table_schema = 'public'
					  AND t.table_type = 'BASE TABLE'
					ORDER BY t.table_name ASC
				`),
				getOrCreateProjectCredentials(dbName)
			]);

			return json({
				success: true,
				dbName,
				tables: tablesRes.rows,
				credentials
			});
		}

		// Jika nama tabel diberikan, kembalikan skema kolom dan isi baris data secara paralel
		if (!isValidIdentifier(tableName)) {
			return json({ error: 'Parameter "table" tidak valid' }, { status: 400 });
		}

		// Eksekusi kueri kolom, primary key, data baris, total count, dan indeks secara bersamaan (Promise.all)
		// Mengambil seluruh metadata tabel & indeks dalam satu round-trip paralel super cepat
		const [columnsRes, pkRes, dataRes, totalRes, indexesRes] = await Promise.all([
			pool.query(`
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
			`, [tableName]),
			pool.query(`
				SELECT kcu.column_name
				FROM information_schema.table_constraints tc
				JOIN information_schema.key_column_usage kcu
				  ON tc.constraint_name = kcu.constraint_name
				  AND tc.table_schema = kcu.table_schema
				WHERE tc.constraint_type = 'PRIMARY KEY'
				  AND tc.table_schema = 'public'
				  AND tc.table_name = $1
			`, [tableName]),
			pool.query(`SELECT * FROM "${tableName}" LIMIT 100`),
			pool.query(`SELECT count(*)::int as count FROM "${tableName}"`),
			pool.query(`
				SELECT
					i.relname AS index_name,
					a.attname AS column_name,
					ix.indisunique AS is_unique,
					ix.indisprimary AS is_primary,
					am.amname AS index_type
				FROM pg_index ix
				JOIN pg_class t ON t.oid = ix.indrelid
				JOIN pg_class i ON i.oid = ix.indexrelid
				JOIN pg_am am ON i.relam = am.oid
				JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
				WHERE t.relname = $1 AND t.relnamespace = 'public'::regnamespace
				ORDER BY i.relname ASC
			`, [tableName])
		]);

		const primaryKey = pkRes.rows[0]?.column_name || null;

		const indexes = (indexesRes.rows || []).map((idx) => ({
			name: idx.index_name,
			column: idx.column_name,
			isUnique: idx.is_unique,
			isPrimary: idx.is_primary,
			type: idx.index_type
		}));

		const indexedColumns = new Set(indexes.map((idx) => idx.column));

		const columns = columnsRes.rows.map((c) => ({
			name: c.column_name,
			type: c.data_type === 'USER-DEFINED' ? c.udt_name : c.data_type,
			nullable: c.is_nullable === 'YES',
			defaultValue: c.column_default,
			isPrimary: c.column_name === primaryKey,
			isIndexed: indexedColumns.has(c.column_name)
		}));

		return json({
			success: true,
			dbName,
			tableName,
			columns,
			primaryKey,
			indexes,
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
		// Action: Ubah Password Database Proyek secara Nyata di Neon PostgreSQL
		if (action === 'changePassword') {
			const { newPassword } = body;
			const result = await rotateProjectPassword(dbName, newPassword);
			return json({
				success: true,
				roleName: result.roleName,
				newPassword: result.newPassword,
				message: `Password proyek "${dbName}" berhasil diubah di database server Neon!`
			});
		}

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

		// Action: Ubah Nama Tabel (Rename Table)
		if (action === 'renameTable') {
			if (!tableName || !isValidIdentifier(tableName)) {
				return json({ error: 'Nama tabel lama tidak valid' }, { status: 400 });
			}

			const { newTableName } = body;
			if (!newTableName || !isValidIdentifier(newTableName)) {
				return json({ error: 'Nama tabel baru hanya boleh huruf, angka, dan underscore' }, { status: 400 });
			}

			await pool.query(`ALTER TABLE "${tableName}" RENAME TO "${newTableName}"`);
			return json({
				success: true,
				message: `Tabel "${tableName}" berhasil diubah menjadi "${newTableName}".`
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

			const rowData = body.rowData || body.data;
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

		// Action: Ubah Baris Data (Update Row)
		if (action === 'updateRow') {
			if (!tableName || !isValidIdentifier(tableName)) {
				return json({ error: 'Nama tabel tidak valid' }, { status: 400 });
			}

			const { pkColumn = 'id', pkValue } = body;
			const rowData = body.rowData || body.data;
			if (!isValidIdentifier(pkColumn) || pkValue === undefined || pkValue === null) {
				return json({ error: 'Identifier baris tidak valid' }, { status: 400 });
			}
			if (!rowData || typeof rowData !== 'object') {
				return json({ error: 'Data perubahan baris tidak valid' }, { status: 400 });
			}

			const setClauses = [];
			const values = [];
			let pIdx = 1;

			for (const [key, val] of Object.entries(rowData)) {
				if (!isValidIdentifier(key) || key === pkColumn) continue;
				setClauses.push(`"${key}" = $${pIdx++}`);
				let parsedVal = val;
				if (val === '') parsedVal = null;
				values.push(parsedVal);
			}

			if (setClauses.length === 0) {
				return json({ error: 'Tidak ada kolom yang diubah' }, { status: 400 });
			}

			values.push(pkValue);
			const updateSql = `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE "${pkColumn}" = $${pIdx} RETURNING *;`;
			const updateRes = await pool.query(updateSql, values);

			return json({
				success: true,
				updated: updateRes.rows[0],
				message: 'Baris data berhasil diperbarui!'
			});
		}

		// Action: Hapus Kolom (Drop Column)
		if (action === 'dropColumn') {
			if (!tableName || !isValidIdentifier(tableName)) {
				return json({ error: 'Nama tabel tidak valid' }, { status: 400 });
			}

			const { columnName } = body;
			if (!columnName || !isValidIdentifier(columnName)) {
				return json({ error: 'Nama kolom tidak valid' }, { status: 400 });
			}

			await pool.query(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${columnName}" CASCADE`);
			return json({
				success: true,
				message: `Kolom "${columnName}" berhasil dihapus dari tabel "${tableName}".`
			});
		}

		// Action: Buat Indeks B-Tree Baru pada Kolom
		if (action === 'createIndex') {
			if (!tableName || !isValidIdentifier(tableName)) {
				return json({ error: 'Nama tabel tidak valid' }, { status: 400 });
			}

			const { columnName, isUnique } = body;
			if (!columnName || !isValidIdentifier(columnName)) {
				return json({ error: 'Nama kolom yang dipilih tidak valid' }, { status: 400 });
			}

			const indexName = `idx_${tableName}_${columnName}`.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 63);
			const uniqueClause = isUnique ? 'UNIQUE' : '';

			await pool.query(`CREATE ${uniqueClause} INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" ("${columnName}");`);
			return json({
				success: true,
				indexName,
				message: `Indeks B-Tree "${indexName}" berhasil dibuat pada kolom "${columnName}"!`
			});
		}

		// Action: Hapus Indeks (Drop Index)
		if (action === 'dropIndex') {
			const { indexName } = body;
			if (!indexName || !isValidIdentifier(indexName)) {
				return json({ error: 'Nama indeks tidak valid' }, { status: 400 });
			}

			await pool.query(`DROP INDEX IF EXISTS "${indexName}" CASCADE;`);
			return json({
				success: true,
				message: `Indeks "${indexName}" berhasil dihapus.`
			});
		}

		return json({ error: `Aksi "${action}" tidak dikenali` }, { status: 400 });
	} catch (err) {
		console.error(`Error in /api/studio POST (db: ${dbName}, action: ${action}):`, err);
		return json({ error: err.message || 'Terjadi kesalahan pada operasi studio database' }, { status: 500 });
	}
}

