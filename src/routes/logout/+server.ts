import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/sitePassword.js';
import type { RequestHandler } from './$types';

/** Signs out by dropping the session cookie, then shows the sign-in page. */
export const POST: RequestHandler = ({ cookies }) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/login');
};
