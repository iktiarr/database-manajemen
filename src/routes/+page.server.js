import { getAllAdmins, hashPassword } from '#lib/server/auth.js';
import { adminPool } from '#lib/server/db.js';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

export async function load({ locals }) {
	let admins = [];
	try {
		admins = await getAllAdmins();
	} catch (err) {
		console.error('Error fetching admins in load:', err);
	}

	let databases = [];
	try {
		const res = await adminPool.query(`
			SELECT datname as name,
			       pg_size_pretty(pg_database_size(datname)) as size,
			       pg_encoding_to_char(encoding) as encoding
			FROM pg_database
			WHERE datistemplate = false
			ORDER BY datname ASC
		`);
		databases = res.rows;
	} catch (err) {
		console.error('Error fetching databases in load:', err);
	}

	const rawDirect = env.DATABASE_BASE_URL || process.env.DATABASE_BASE_URL || env.ADMIN_DATABASE_URL || process.env.ADMIN_DATABASE_URL || '';
	const rawPooled = env.DATABASE_URL || process.env.DATABASE_URL || '';

	let neonEndpoint = 'Neon Cloud';
	try {
		const targetHost = env.DATABASE_URL || process.env.DATABASE_URL;
		if (targetHost) {
			neonEndpoint = new URL(targetHost).host;
		}
	} catch {}

	return {
		currentAdmin: locals.admin || null,
		admins: admins || [],
		databases: databases || [],
		neonBranch: env.NEON_BRANCH || process.env.NEON_BRANCH || 'production',
		hasNeonAuth: Boolean(env.NEON_AUTH_BASE_URL || process.env.NEON_AUTH_BASE_URL),
		hasRealtime: Boolean(env.NEON_REALTIME_URL || process.env.NEON_REALTIME_URL),
		neonEndpoint,
		rawDirectUrl: rawDirect,
		rawPooledUrl: rawPooled
	};
}

export const actions = {
	createAdmin: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim();
		const password = formData.get('password')?.toString();
		const role = formData.get('role')?.toString() || 'admin';

		if (!email || !password) {
			return fail(400, { adminError: 'Email dan password wajib diisi.' });
		}

		if (password.length < 6) {
			return fail(400, { adminError: 'Password minimal 6 karakter.' });
		}

		try {
			const check = await adminPool.query('SELECT id FROM admins WHERE LOWER(email) = LOWER($1)', [email]);
			if (check.rows.length > 0) {
				return fail(400, { adminError: `Admin dengan email ${email} sudah terdaftar.` });
			}

			const pwHash = hashPassword(password);
			await adminPool.query('INSERT INTO admins (email, password_hash, role, is_active) VALUES ($1, $2, $3, true)', [
				email,
				pwHash,
				role
			]);

			return { adminSuccess: `Admin ${email} berhasil ditambahkan.` };
		} catch (err) {
			console.error('Create admin error:', err);
			return fail(500, { adminError: err.message || 'Gagal menambahkan admin.' });
		}
	},

	updateAdmin: async ({ request, locals, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const email = formData.get('email')?.toString().trim();
		const role = formData.get('role')?.toString() || 'admin';
		const password = formData.get('password')?.toString();

		if (!id || !email) {
			return fail(400, { adminError: 'ID dan email wajib diisi.' });
		}

		try {
			// Periksa apakah admin yang diedit adalah akun yang sedang login saat ini
			let isSelf = false;
			if (locals.admin) {
				if (String(locals.admin.id) === String(id)) {
					isSelf = true;
				} else {
					const existing = await adminPool.query('SELECT email FROM admins WHERE id = $1', [id]);
					if (existing.rows[0]?.email?.toLowerCase() === locals.admin.email?.toLowerCase()) {
						isSelf = true;
					}
				}
			}

			if (password && password.trim().length >= 6) {
				const pwHash = hashPassword(password.trim());
				await adminPool.query('UPDATE admins SET email = $1, role = $2, password_hash = $3 WHERE id = $4', [
					email,
					role,
					pwHash,
					id
				]);
			} else {
				await adminPool.query('UPDATE admins SET email = $1, role = $2 WHERE id = $3', [
					email,
					role,
					id
				]);
			}

			if (isSelf) {
				// Hapus cookie sesi agar otomatis logout dan perlu login ulang
				cookies.delete('admin_session', { path: '/' });
				return { adminSuccess: `Akun Anda berhasil diperbarui. Silakan login kembali.`, requireRelogin: true };
			}

			return { adminSuccess: `Data admin ${email} berhasil diperbarui.` };
		} catch (err) {
			console.error('Update admin error:', err);
			return fail(500, { adminError: err.message || 'Gagal memperbarui admin.' });
		}
	},

	toggleAdminStatus: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return fail(400, { adminError: 'ID tidak valid' });

		// Akun yang sedang login tidak bisa menonaktifkan dirinya sendiri
		if (locals.admin) {
			if (String(locals.admin.id) === String(id)) {
				return fail(400, { adminError: 'Akun yang sedang login tidak dapat menonaktifkan dirinya sendiri.' });
			}
			const targetCheck = await adminPool.query('SELECT email FROM admins WHERE id = $1', [id]);
			if (targetCheck.rows[0]?.email?.toLowerCase() === locals.admin.email?.toLowerCase()) {
				return fail(400, { adminError: 'Akun yang sedang login tidak dapat menonaktifkan dirinya sendiri.' });
			}
		}

		try {
			await adminPool.query('UPDATE admins SET is_active = NOT COALESCE(is_active, true) WHERE id = $1', [id]);
			return { adminSuccess: 'Status admin berhasil diubah.' };
		} catch (err) {
			console.error('Toggle status error:', err);
			return fail(500, { adminError: err.message || 'Gagal mengubah status admin.' });
		}
	},

	deleteAdmin: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return fail(400, { adminError: 'ID tidak valid' });

		if (locals.admin) {
			if (String(locals.admin.id) === String(id)) {
				return fail(400, { adminError: 'Anda tidak dapat menghapus akun sendiri saat sedang login.' });
			}
			const targetCheck = await adminPool.query('SELECT email FROM admins WHERE id = $1', [id]);
			if (targetCheck.rows[0]?.email?.toLowerCase() === locals.admin.email?.toLowerCase()) {
				return fail(400, { adminError: 'Anda tidak dapat menghapus akun sendiri saat sedang login.' });
			}
		}

		try {
			await adminPool.query('DELETE FROM admins WHERE id = $1', [id]);
			return { adminSuccess: 'Admin berhasil dihapus.' };
		} catch (err) {
			console.error('Delete admin error:', err);
			return fail(500, { adminError: err.message || 'Gagal menghapus admin.' });
		}
	}
};
