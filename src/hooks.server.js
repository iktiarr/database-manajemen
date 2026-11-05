import { redirect } from '@sveltejs/kit';
import { verifySessionToken } from '#lib/server/auth.js';

/**
 * Server Hook untuk autentikasi admin dan proteksi route
 */
export async function handle({ event, resolve }) {
	const sessionCookie = event.cookies.get('admin_session');
	const admin = verifySessionToken(sessionCookie);

	event.locals.admin = admin;

	const { pathname } = event.url;

	// Biarkan API endpoints diproses (API query/databases memakai Bearer Master Key)
	if (pathname.startsWith('/api/')) {
		return resolve(event);
	}

	// Jika di halaman login dan sudah terautentikasi, redirect ke dashboard
	if (pathname === '/login') {
		if (admin) {
			throw redirect(303, '/');
		}
		return resolve(event);
	}

	// Jika belum login, redirect langsung ke /login
	if (!admin) {
		throw redirect(303, '/login');
	}

	return resolve(event);
}

