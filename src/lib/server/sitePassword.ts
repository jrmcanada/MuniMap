/** The cookie that proves a visitor entered the site password. */
export const SESSION_COOKIE = 'munimap-session';
/** The wall display stays signed in for a year; changing the password signs everyone out. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const encoder = new TextEncoder();

/**
 * What the cookie holds: a keyed hash of the password, never the password. Anyone who can read the
 * cookie cannot work backwards to the password, and changing the password makes old cookies useless.
 */
export async function sessionToken(password: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('munimap-session'));
	return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Compares two same-length strings without stopping at the first difference. */
function sameText(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let difference = 0;
	for (let index = 0; index < a.length; index++) {
		difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
	}
	return difference === 0;
}

/** True when what was typed is the site password. Both sides are hashed first, so lengths match. */
export async function passwordMatches(entered: string, password: string): Promise<boolean> {
	if (!entered || !password) return false;
	return sameText(await sessionToken(entered), await sessionToken(password));
}

export type Access = 'allow' | 'login' | 'unauthorized' | 'unconfigured';

export interface AccessInputs {
	pathname: string;
	/** The password set in the environment, if any. */
	password: string | undefined;
	/** True when running on Netlify, where a missing password must lock the site, not open it. */
	onNetlify: boolean;
	/** The session cookie the visitor sent, if any. */
	cookie: string | undefined;
}

/**
 * Decides what a request may do. With no password set, a local copy is open (so development and
 * tests need no setup) but the Netlify site refuses everything, so a forgotten setting never
 * leaves the site public. API calls get a 401; pages get sent to the sign-in page.
 */
export async function accessFor({
	pathname,
	password,
	onNetlify,
	cookie
}: AccessInputs): Promise<Access> {
	if (!password) return onNetlify ? 'unconfigured' : 'allow';
	if (pathname === '/login') return 'allow';
	if (cookie && sameText(cookie, await sessionToken(password))) return 'allow';
	return pathname.startsWith('/api/') ? 'unauthorized' : 'login';
}
