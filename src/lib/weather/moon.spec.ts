import { describe, it, expect } from 'vitest';
import { moonPass, moonPhase } from './moon.js';
import { litMoonPath } from './moonShape.js';

// Sudbury.
const LATITUDE = 46.49;
const LONGITUDE = -80.993;

describe('moonPhase', () => {
	it('is new at the new moon of 10 October 2026', () => {
		const phase = moonPhase(new Date('2026-10-10T15:50:00Z'));
		expect(Math.min(phase, 1 - phase)).toBeLessThan(0.02);
	});

	it('is full at the full moon of 26 October 2026', () => {
		expect(moonPhase(new Date('2026-10-26T04:12:00Z'))).toBeCloseTo(0.5, 1);
	});

	it('is a quarter about a week after the new moon', () => {
		expect(moonPhase(new Date('2026-10-18T00:00:00Z'))).toBeCloseTo(0.25, 1);
	});
});

describe('moonPass', () => {
	it('is up at midnight at full moon, and rose in the evening and sets in the morning', () => {
		const midnight = new Date('2026-10-26T04:00:00Z');
		const pass = moonPass(midnight, LATITUDE, LONGITUDE);

		expect(pass).not.toBeNull();
		expect(pass!.rise.getTime()).toBeLessThan(midnight.getTime());
		expect(pass!.set.getTime()).toBeGreaterThan(midnight.getTime());
		// Full moon: up for roughly the night, from about sunset to about sunrise.
		const hours = (pass!.set.getTime() - pass!.rise.getTime()) / 3_600_000;
		expect(hours).toBeGreaterThan(11);
		expect(hours).toBeLessThan(16);
	});

	it('is down at midnight at new moon', () => {
		expect(moonPass(new Date('2026-10-10T04:00:00Z'), LATITUDE, LONGITUDE)).toBeNull();
	});

	it('is up at midday at new moon', () => {
		expect(moonPass(new Date('2026-10-10T17:00:00Z'), LATITUDE, LONGITUDE)).not.toBeNull();
	});
});

describe('litMoonPath', () => {
	it('lights the right side of a waxing crescent and the left side of a waning one', () => {
		expect(litMoonPath(0.1)).toContain('A1 1 0 0 1 0 1');
		expect(litMoonPath(0.9)).toContain('A1 1 0 0 0 0 1');
	});

	it('is a straight edge at the quarters and a full disc at full moon', () => {
		expect(litMoonPath(0.25)).toContain('A0.000 1');
		expect(litMoonPath(0.5)).toContain('A1.000 1');
	});
});
