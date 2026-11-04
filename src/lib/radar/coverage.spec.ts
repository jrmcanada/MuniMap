import { describe, it, expect } from 'vitest';
import { echoesAt } from './coverage.js';

/** A 3 by 2 image: opaque at (1, 0), faint at (2, 0), nothing elsewhere. */
function image() {
	const pixels = new Uint8ClampedArray(3 * 2 * 4);
	pixels[(0 * 3 + 1) * 4 + 3] = 255;
	pixels[(0 * 3 + 2) * 4 + 3] = 20;
	return pixels;
}

describe('echoesAt', () => {
	it('finds precipitation under a point, and ignores empty and faint pixels', () => {
		const points = [
			{ x: 1, y: 0 },
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
			{ x: 1, y: 1 }
		];
		expect(echoesAt(image(), 3, 2, points)).toEqual([true, false, false, false]);
	});

	it('rounds a point to its nearest pixel', () => {
		expect(echoesAt(image(), 3, 2, [{ x: 1.4, y: 0.3 }])).toEqual([true]);
	});

	it('treats points outside the image as dry', () => {
		const outside = [
			{ x: -1, y: 0 },
			{ x: 3, y: 0 },
			{ x: 1, y: 2 }
		];
		expect(echoesAt(image(), 3, 2, outside)).toEqual([false, false, false]);
	});
});
