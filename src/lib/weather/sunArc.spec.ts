import { describe, it, expect } from 'vitest';
import { SUN_ARC, sunPosition } from './sunArc.js';

const sun = {
	sunrise: new Date('2026-10-23T12:00:00Z'),
	sunset: new Date('2026-10-23T22:00:00Z')
};

describe('sunPosition', () => {
	it('starts at the left end of the arc at sunrise', () => {
		const position = sunPosition(sun.sunrise, sun)!;
		expect(position.x).toBeCloseTo(SUN_ARC.left, 5);
		expect(position.y).toBeCloseTo(SUN_ARC.baseline, 5);
	});

	it('is at the top, in the middle, at midday', () => {
		const position = sunPosition(new Date('2026-10-23T17:00:00Z'), sun)!;
		expect(position.x).toBeCloseTo(SUN_ARC.centreX, 5);
		expect(position.y).toBeCloseTo(SUN_ARC.baseline - SUN_ARC.radiusY, 5);
	});

	it('ends at the right end at sunset', () => {
		const position = sunPosition(sun.sunset, sun)!;
		expect(position.x).toBeCloseTo(SUN_ARC.right, 5);
		expect(position.y).toBeCloseTo(SUN_ARC.baseline, 5);
	});

	it('has no position before sunrise or after sunset', () => {
		expect(sunPosition(new Date('2026-10-23T11:59:00Z'), sun)).toBeNull();
		expect(sunPosition(new Date('2026-10-23T22:01:00Z'), sun)).toBeNull();
	});
});
