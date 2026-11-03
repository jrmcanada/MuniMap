import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	/** Ontario 511 developer key. Server-only; optional so the app still builds and runs without it. */
	ONTARIO_511_KEY: {
		schema: (value) => value?.trim() || undefined,
		description: 'Developer key for the Ontario 511 road conditions and events feeds.'
	}
});
