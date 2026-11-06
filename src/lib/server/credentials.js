import crypto from 'node:crypto';
import { adminPool, getTargetPool } from '#lib/server/db.js';

export function generateSecurePassword(length = 24) {
	const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
	const lowercase = 'abcdefghijkmnpqrstuvwxyz';
	const numbers = '23456789';
	const symbols = '!@#$%^&*()_+~=';
	const allChars = uppercase + lowercase + numbers + symbols;

	const bytes = crypto.randomBytes(length);
	const password = [
		uppercase[bytes[0] % uppercase.length],
		lowercase[bytes[1] % lowercase.length],
		numbers[bytes[2] % numbers.length],
		symbols[bytes[3] % symbols.length]
	];

	for (let i = 4; i < length; i++) {
		password.push(allChars[bytes[i] % allChars.length]);
	}

	for (let i = password.length - 1; i > 0; i--) {
		const j = bytes[i] % (i + 1);
		[password[i], password[j]] = [password[j], password[i]];
	}

	return password.join('');
}

export function getProjectRoleName(dbName) {
	return `usr_${dbName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
}

/**
 * Memastikan tabel `project_credentials` ada di database sistem.
 */
async function ensureCredentialsTable() {
	await adminPool.query(`
		CREATE TABLE IF NOT EXISTS project_credentials (
			db_name VARCHAR(128) PRIMARY KEY,
			role_name VARCHAR(128) NOT NULL,
			db_password TEXT NOT NULL,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`);
}

/**
 * Mengambil atau membuat kredensial (user & password) khusus per-proyek database.
 * @param {string} dbName
 * @returns {Promise<{ roleName: string, dbPassword: string }>}
 */
export async function getOrCreateProjectCredentials(dbName) {
	await ensureCredentialsTable();
	const roleName = getProjectRoleName(dbName);

	const existing = await adminPool.query(
		'SELECT role_name, db_password FROM project_credentials WHERE db_name = $1',
		[dbName]
	);

	if (existing.rows.length > 0) {
		const cred = existing.rows[0];
		// Pastikan role benar-benar ada di Neon PostgreSQL
		await adminPool.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${roleName}') THEN
					CREATE ROLE "${roleName}" WITH LOGIN PASSWORD '${cred.db_password}';
				END IF;
			END
			$$;
		`);
		return { roleName: cred.role_name, dbPassword: cred.db_password };
	}

	// Belum ada -> buat role dan password baru
	const newPassword = generateSecurePassword(24);
	await rotateProjectPassword(dbName, newPassword);
	return { roleName, dbPassword: newPassword };
}

/**
 * Mengubah password role proyek secara nyata di database PostgreSQL Neon.
 * Perubahan ini langsung menghanguskan password lama di server.
 * @param {string} dbName
 * @param {string} [customPassword]
 * @returns {Promise<{ roleName: string, newPassword: string }>}
 */
export async function rotateProjectPassword(dbName, customPassword = null) {
	await ensureCredentialsTable();
	const roleName = getProjectRoleName(dbName);
	const newPassword = customPassword || generateSecurePassword(24);

	// 1. Buat atau ubah password role di Neon PostgreSQL
	await adminPool.query(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${roleName}') THEN
				CREATE ROLE "${roleName}" WITH LOGIN PASSWORD '${newPassword}';
			ELSE
				ALTER ROLE "${roleName}" WITH PASSWORD '${newPassword}';
			END IF;
		END
		$$;
	`);

	// 2. Berikan hak akses penuh ke database target
	await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${roleName}";`);

	// 3. Berikan hak akses skema, tabel, dan sequence di dalam database target
	try {
		const targetPool = getTargetPool(dbName);
		await targetPool.query(`GRANT ALL ON SCHEMA public TO "${roleName}";`);
		await targetPool.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO "${roleName}";`);
		await targetPool.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "${roleName}";`);
		await targetPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${roleName}";`);
		await targetPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${roleName}";`);
	} catch (err) {
		console.warn(`Warning setting schema permissions on database "${dbName}":`, err.message);
	}

	// 4. Simpan ke project_credentials
	await adminPool.query(
		`
		INSERT INTO project_credentials (db_name, role_name, db_password, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (db_name)
		DO UPDATE SET db_password = EXCLUDED.db_password, updated_at = NOW();
	`,
		[dbName, roleName, newPassword]
	);

	return { roleName, newPassword };
}

/**
 * Menghapus role dan kredensial proyek saat proyek dihapus.
 * @param {string} dbName
 */
export async function deleteProjectCredentials(dbName) {
	await ensureCredentialsTable();
	const roleName = getProjectRoleName(dbName);

	await adminPool.query('DELETE FROM project_credentials WHERE db_name = $1', [dbName]);

	try {
		await adminPool.query(`DROP ROLE IF EXISTS "${roleName}";`);
	} catch (err) {
		console.warn(`Could not drop role "${roleName}":`, err.message);
	}
}
