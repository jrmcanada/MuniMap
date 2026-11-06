import { describe, it, expect } from 'vitest';
import { municipalities } from './municipalities.js';
import { office } from './office.js';
import { places } from './places.js';

describe('places', () => {
	it('has about 20 to 32 uniquely named places', () => {
		expect(places.length).toBeGreaterThanOrEqual(18);
		expect(places.length).toBeLessThanOrEqual(32);
		expect(new Set(places.map((place) => place.name)).size).toBe(places.length);
	});

	it('keeps every place inside Ontario', () => {
		for (const { longitude, latitude } of places) {
			expect(longitude).toBeGreaterThan(-95.2);
			expect(longitude).toBeLessThan(-74.3);
			expect(latitude).toBeGreaterThan(41.6);
			expect(latitude).toBeLessThan(56.9);
		}
	});

	it('puts a place that is also a pin at the same position as the pin', () => {
		const pins = [...municipalities, { ...office, name: office.city }];
		for (const place of places) {
			const pin = pins.find((candidate) => candidate.name === place.name);
			if (pin) expect([place.longitude, place.latitude]).toEqual([pin.longitude, pin.latitude]);
		}
	});
});
