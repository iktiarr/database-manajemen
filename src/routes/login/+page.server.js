import { fail, redirect } from '@sveltejs/kit';
import { getAdminByEmail, verifyPassword, createSessionToken } from '#lib/server/auth.js';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'Email dan password wajib diisi.' });
		}

		try {
			const admin = await getAdminByEmail(email);
			if (!admin) {
				return fail(401, { error: 'Email atau password salah.' });
			}

			if (admin.is_active === false) {
				return fail(403, { error: 'Akun Anda dinonaktifkan oleh administrator.' });
			}

			const isValid = verifyPassword(password, admin.password_hash);
			if (!isValid) {
				return fail(401, { error: 'Email atau password salah.' });
			}

			// Generate session token
			const token = createSessionToken(admin);

			cookies.set('admin_session', token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 7 // 7 hari
			});
		} catch (err) {
			console.error('Login action error:', err);
			return fail(500, { error: 'Terjadi kesalahan sistem saat verifikasi.' });
		}

		throw redirect(303, '/');
	}
};

