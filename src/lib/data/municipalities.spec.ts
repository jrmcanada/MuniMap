import { describe, it, expect } from 'vitest';
import { municipalities } from './municipalities.js';
import { createProjection, projectPlaces } from '#lib/map/projection.js';

// Loose box around Ontario.
const ONTARIO = { west: -95.2, east: -74.3, south: 41.6, north: 56.9 };

describe('municipalities', () => {
	it('lists 54 municipalities with unique names', () => {
		expect(municipalities).toHaveLength(54);
		expect(new Set(municipalities.map((m) => m.name)).size).toBe(54);
	});

	it('keeps every coordinate inside Ontario', () => {
		for (const m of municipalities) {
			expect(m.longitude).toBeGreaterThan(ONTARIO.west);
			expect(m.longitude).toBeLessThan(ONTARIO.east);
			expect(m.latitude).toBeGreaterThan(ONTARIO.south);
			expect(m.latitude).toBeLessThan(ONTARIO.north);
		}
	});
});

describe('projection', () => {
	it('places every pin inside the canvas', () => {
		const projection = createProjection(1440, 1080, municipalities);
		for (const pin of projectPlaces(projection, municipalities)) {
			expect(Number.isFinite(pin.x) && Number.isFinite(pin.y)).toBe(true);
			expect(pin.x).toBeGreaterThan(0);
			expect(pin.x).toBeLessThan(1440);
			expect(pin.y).toBeGreaterThan(0);
			expect(pin.y).toBeLessThan(1080);
		}
	});
});
