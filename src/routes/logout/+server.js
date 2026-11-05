import { redirect } from '@sveltejs/kit';

export async function POST({ cookies }) {
	cookies.delete('admin_session', { path: '/' });
	throw redirect(303, '/login');
}

export async function GET({ cookies }) {
	cookies.delete('admin_session', { path: '/' });
	throw redirect(303, '/login');
}

