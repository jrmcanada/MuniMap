/** The cookie that proves a visitor entered the site password. */
export const SESSION_COOKIE = 'munimap-session';
/** The wall display stays signed in for a year; changing the password signs everyone out. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
/** A guest stays signed in for a day; changing the guest password signs out only guests. */
export const GUEST_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

const encoder = new TextEncoder();

/**
 * What the cookie holds: a keyed hash of the password, never the password. Anyone who can read the
 * cookie cannot work backwards to the password, and changing the password makes old cookies useless.
 */
export async function sessionToken(password: string): Promise<string> {
	return sign(password, 'munimap-session');
}

/**
 * A guest's cookie: when it runs out (Unix seconds) and a hash of that time keyed by the guest
 * password. The server checks the time itself, so keeping the cookie past a day does not help.
 */
export async function guestToken(guestPassword: string, expiresAt: number): Promise<string> {
	return `guest.${expiresAt}.${await sign(guestPassword, `munimap-guest:${expiresAt}`)}`;
}

async function sign(password: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
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
	/** The guest password set in the environment, if any. */
	guestPassword: string | undefined;
	/** True when running on Netlify, where a missing password must lock the site, not open it. */
	onNetlify: boolean;
	/** The session cookie the visitor sent, if any. */
	cookie: string | undefined;
	/** The current time in Unix seconds, to check a guest cookie has not run out. */
	now: number;
}

/**
 * Decides what a request may do. With no password set, a local copy is open (so development and
 * tests need no setup) but the Netlify site refuses everything, so a forgotten setting never
 * leaves the site public. API calls get a 401; pages get sent to the sign-in page.
 */
export async function accessFor({
	pathname,
	password,
	guestPassword,
	onNetlify,
	cookie,
	now
}: AccessInputs): Promise<Access> {
	if (!password) return onNetlify ? 'unconfigured' : 'allow';
	if (pathname === '/login') return 'allow';
	if (cookie && sameText(cookie, await sessionToken(password))) return 'allow';
	if (cookie && guestPassword && (await isGuestCookie(cookie, guestPassword, now))) return 'allow';
	return pathname.startsWith('/api/') ? 'unauthorized' : 'login';
}

async function isGuestCookie(cookie: string, guestPassword: string, now: number): Promise<boolean> {
	const expiresAt = Number(cookie.split('.')[1]);
	if (!Number.isInteger(expiresAt) || expiresAt <= now) return false;
	return sameText(cookie, await guestToken(guestPassword, expiresAt));
}
