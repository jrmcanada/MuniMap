import { describe, it, expect } from 'vitest';
import { isClear, placeLabel } from './label.js';

const label = { width: 100, height: 20 };

describe('placeLabel', () => {
	it('puts the label to the right of the pin, centred on it', () => {
		const spot = placeLabel({ x: 200, y: 300 }, label, 1000, 800);
		expect(spot.x).toBeGreaterThan(200);
		expect(spot.y).toBe(290);
	});

	it('flips to the left when the right side would run off the map', () => {
		const spot = placeLabel({ x: 950, y: 300 }, label, 1000, 800);
		expect(spot.x + label.width).toBeLessThan(950);
	});

	it('stays inside the map at every edge', () => {
		for (const pin of [
			{ x: 0, y: 0 },
			{ x: 1000, y: 0 },
			{ x: 0, y: 800 },
			{ x: 1000, y: 800 }
		]) {
			const spot = placeLabel(pin, label, 1000, 800);
			expect(spot.x).toBeGreaterThanOrEqual(0);
			expect(spot.y).toBeGreaterThanOrEqual(0);
			expect(spot.x + label.width).toBeLessThanOrEqual(1000);
			expect(spot.y + label.height).toBeLessThanOrEqual(800);
		}
	});
});

describe('isClear', () => {
	const box = { x: 100, y: 100, width: 50, height: 10 };

	it('is clear of boxes that are far away, and when there are none', () => {
		expect(isClear(box, [], 4)).toBe(true);
		expect(isClear(box, [{ x: 300, y: 300, width: 50, height: 10 }], 4)).toBe(true);
	});

	it('is not clear of a box that overlaps or sits within the margin', () => {
		expect(isClear(box, [{ x: 120, y: 105, width: 50, height: 10 }], 4)).toBe(false);
		expect(isClear(box, [{ x: 152, y: 100, width: 50, height: 10 }], 4)).toBe(false);
		expect(isClear(box, [{ x: 156, y: 100, width: 50, height: 10 }], 4)).toBe(true);
	});
});
