import { SITE_PASSWORD } from '$app/env/private';
import { fail, redirect } from '@sveltejs/kit';
import {
	SESSION_COOKIE,
	SESSION_MAX_AGE_SECONDS,
	passwordMatches,
	sessionToken
} from '#lib/server/sitePassword.js';
import type { Actions } from './$types';

/** A short pause after a wrong guess, so guessing by script is slow. */
const WRONG_GUESS_DELAY_MS = 1000;

export const actions: Actions = {
	signIn: async ({ request, cookies, url }) => {
		const entered = String((await request.formData()).get('password') ?? '');
		if (!SITE_PASSWORD || !(await passwordMatches(entered, SITE_PASSWORD))) {
			await new Promise((resolve) => setTimeout(resolve, WRONG_GUESS_DELAY_MS));
			return fail(400, { wrong: true });
		}
		cookies.set(SESSION_COOKIE, await sessionToken(SITE_PASSWORD), {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE_SECONDS
		});
		redirect(303, '/');
	}
};
