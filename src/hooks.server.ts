import { NETLIFY, SITE_PASSWORD } from '$app/env/private';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, accessFor } from '#lib/server/sitePassword.js';

/** Every page and API call needs the site password, except the sign-in page itself. */
export const handle: Handle = async ({ event, resolve }) => {
	const access = await accessFor({
		pathname: event.url.pathname,
		password: SITE_PASSWORD,
		onNetlify: NETLIFY !== undefined,
		cookie: event.cookies.get(SESSION_COOKIE)
	});

	if (access === 'unconfigured') {
		return new Response('This site has no password set, so it is locked.', { status: 503 });
	}
	if (access === 'unauthorized') return new Response('Sign in first.', { status: 401 });
	if (access === 'login') redirect(303, '/login');
	return resolve(event);
};
