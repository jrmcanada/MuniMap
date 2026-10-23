import { describe, it, expect } from 'vitest';
import { bearingOf } from './compass.js';

describe('bearingOf', () => {
	it('gives the bearing for each kind of compass point', () => {
		expect(bearingOf('N')).toBe(0);
		expect(bearingOf('E')).toBe(90);
		expect(bearingOf('NW')).toBe(315);
		expect(bearingOf('WNW')).toBe(292.5);
	});

	it('ignores case and spaces', () => {
		expect(bearingOf(' sw ')).toBe(225);
	});

	it('returns null for anything else', () => {
		expect(bearingOf(undefined)).toBeNull();
		expect(bearingOf('calm')).toBeNull();
		expect(bearingOf('')).toBeNull();
	});
});
