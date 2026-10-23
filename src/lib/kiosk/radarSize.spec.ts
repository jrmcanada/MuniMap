import { describe, it, expect } from 'vitest';
import { MAX_RADAR_WIDTH, radarRequestSize } from './radarSize.js';

describe('radarRequestSize', () => {
	it('leaves a canvas at or under the cap alone', () => {
		expect(radarRequestSize(1516, 1004)).toEqual({ width: 1516, height: 1004 });
		expect(radarRequestSize(MAX_RADAR_WIDTH, 900)).toEqual({ width: MAX_RADAR_WIDTH, height: 900 });
	});

	it('shrinks a 4K canvas to the cap and keeps its shape', () => {
		const size = radarRequestSize(3032, 2009);
		expect(size.width).toBe(1600);
		expect(size.height).toBe(Math.round(2009 * (1600 / 3032)));
		expect(size.width / size.height).toBeCloseTo(3032 / 2009, 2);
	});

	it('cuts the memory for 31 frames at 4K by about three quarters', () => {
		const full = 3032 * 2009;
		const capped = radarRequestSize(3032, 2009);
		expect((capped.width * capped.height) / full).toBeLessThan(0.3);
	});
});
