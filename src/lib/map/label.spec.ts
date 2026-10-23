import { describe, it, expect } from 'vitest';
import { placeLabel } from './label.js';

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
