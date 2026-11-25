import { describe, it, expect } from 'vitest';
import { accessFor, guestToken, passwordMatches, sessionToken } from './sitePassword.js';

describe('the site password', () => {
	it('makes a token that is not the password and changes with it', async () => {
		const token = await sessionToken('hunter2');
		expect(token).toMatch(/^[0-9a-f]{64}$/);
		expect(token).not.toContain('hunter2');
		expect(await sessionToken('hunter3')).not.toBe(token);
	});

	it('accepts the right password and refuses others', async () => {
		expect(await passwordMatches('hunter2', 'hunter2')).toBe(true);
		expect(await passwordMatches('hunter', 'hunter2')).toBe(false);
		expect(await passwordMatches('', 'hunter2')).toBe(false);
	});
});

describe('who may see what', () => {
	const now = 1_800_000_000;
	const base = {
		pathname: '/',
		password: 'hunter2',
		guestPassword: undefined,
		onNetlify: true,
		cookie: undefined,
		now
	};

	it('sends a visitor with no cookie to the sign-in page, and refuses API calls', async () => {
		expect(await accessFor(base)).toBe('login');
		expect(await accessFor({ ...base, pathname: '/api/road-events' })).toBe('unauthorized');
	});

	it('always shows the sign-in page', async () => {
		expect(await accessFor({ ...base, pathname: '/login' })).toBe('allow');
	});

	it('lets in a visitor holding the right cookie, and not a wrong or old one', async () => {
		const cookie = await sessionToken('hunter2');
		expect(await accessFor({ ...base, cookie })).toBe('allow');
		expect(await accessFor({ ...base, pathname: '/api/road-events', cookie })).toBe('allow');
		expect(await accessFor({ ...base, cookie: await sessionToken('old-password') })).toBe('login');
		expect(await accessFor({ ...base, cookie: 'guess' })).toBe('login');
	});

	it('is open on a local copy with no password, but locked on Netlify', async () => {
		expect(await accessFor({ ...base, password: undefined, onNetlify: false })).toBe('allow');
		expect(await accessFor({ ...base, password: undefined })).toBe('unconfigured');
		expect(await accessFor({ ...base, password: '' })).toBe('unconfigured');
	});
});

describe('the guest password', () => {
	const now = 1_800_000_000;
	const base = {
		pathname: '/',
		password: 'hunter2',
		guestPassword: 'visitor',
		onNetlify: true,
		now
	};

	it('lets in a guest until their cookie runs out, on pages and API calls', async () => {
		const cookie = await guestToken('visitor', now + 60);
		expect(await accessFor({ ...base, cookie })).toBe('allow');
		expect(await accessFor({ ...base, pathname: '/api/road-events', cookie })).toBe('allow');
		expect(await accessFor({ ...base, cookie, now: now + 60 })).toBe('login');
	});

	it('refuses a guest cookie with a changed time, or after the guest password changes', async () => {
		const cookie = await guestToken('visitor', now + 60);
		const stretched = cookie.replace(`.${now + 60}.`, `.${now + 999_999}.`);
		expect(await accessFor({ ...base, cookie: stretched })).toBe('login');
		expect(await accessFor({ ...base, cookie, guestPassword: 'new-visitor' })).toBe('login');
	});

	it('refuses every guest cookie when no guest password is set', async () => {
		const cookie = await guestToken('visitor', now + 60);
		expect(await accessFor({ ...base, cookie, guestPassword: undefined })).toBe('login');
	});

	it('keeps staff signed in when the guest password changes', async () => {
		const cookie = await sessionToken('hunter2');
		expect(await accessFor({ ...base, cookie, guestPassword: 'new-visitor' })).toBe('allow');
	});
});
