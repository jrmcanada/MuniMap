import { GUEST_PASSWORD, SITE_PASSWORD } from '$app/env/private';
import { fail, redirect } from '@sveltejs/kit';
import {
	GUEST_SESSION_MAX_AGE_SECONDS,
	SESSION_COOKIE,
	SESSION_MAX_AGE_SECONDS,
	guestToken,
	passwordMatches,
	sessionToken
} from '#lib/server/sitePassword.js';
import type { Actions } from './$types';

/** A short pause after a wrong guess, so guessing by script is slow. */
const WRONG_GUESS_DELAY_MS = 1000;

export const actions: Actions = {
	signIn: async ({ request, cookies, url }) => {
		const entered = String((await request.formData()).get('password') ?? '');
		const session = await sessionFor(entered);
		if (!session) {
			await new Promise((resolve) => setTimeout(resolve, WRONG_GUESS_DELAY_MS));
			return fail(400, { wrong: true });
		}
		cookies.set(SESSION_COOKIE, session.token, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: session.maxAge
		});
		redirect(303, '/');
	}
};

/** The cookie to set for what was typed: the site password, the guest password, or neither. */
async function sessionFor(entered: string): Promise<{ token: string; maxAge: number } | null> {
	if (!SITE_PASSWORD) return null;
	if (await passwordMatches(entered, SITE_PASSWORD)) {
		return { token: await sessionToken(SITE_PASSWORD), maxAge: SESSION_MAX_AGE_SECONDS };
	}
	if (GUEST_PASSWORD && (await passwordMatches(entered, GUEST_PASSWORD))) {
		const expiresAt = Math.floor(Date.now() / 1000) + GUEST_SESSION_MAX_AGE_SECONDS;
		return {
			token: await guestToken(GUEST_PASSWORD, expiresAt),
			maxAge: GUEST_SESSION_MAX_AGE_SECONDS
		};
	}
	return null;
}
