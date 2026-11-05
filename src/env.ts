import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	/** Ontario 511 developer key. Server-only; optional so the app still builds and runs without it. */
	ONTARIO_511_KEY: {
		schema: (value) => value?.trim() || undefined,
		description: 'Developer key for the Ontario 511 road conditions and events feeds.'
	},
	/** The shared sign-in password. Unset on a local copy, which is then open; the Netlify site locks. */
	SITE_PASSWORD: {
		schema: (value) => value?.trim() || undefined,
		description: 'The one password that lets people into the site.'
	},
	/** Set by Netlify itself ("true") on its builds and functions; never set by hand. */
	NETLIFY: {
		schema: (value) => value || undefined,
		description: 'Present only when running on Netlify.'
	}
});
