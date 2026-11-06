import { describe, it, expect } from 'vitest';
import type { Place } from '#lib/data/places.js';
import { layoutPlaceNames, placesToName } from './placeNames.js';

const size = { width: 1000, height: 600 };
const measure = (text: string) => text.length * 6;
const place = (name: string, keep?: true, side?: 'left' | 'right', down?: number): Place => ({
	name,
	longitude: 0,
	latitude: 0,
	keep,
	side,
	down
});
const layout = (
	places: Place[],
	positions: { x: number; y: number }[],
	pins = positions.slice(0, 0)
) => layoutPlaceNames(places, positions, pins, size, 12, measure);

describe('layoutPlaceNames', () => {
	it('puts a name to the right of its place', () => {
		const [name] = layout([place('Barrie')], [{ x: 300, y: 300 }]);
		expect(name.textX).toBeGreaterThan(300);
		expect(name.hasPin).toBe(false);
	});

	it('puts a name on the left of its place when the place asks for it', () => {
		const [name] = layout([place('Wawa', undefined, 'left')], [{ x: 300, y: 300 }]);
		expect(name.textX + measure('Wawa')).toBeLessThan(300);
	});

	it('keeps a left-side name on the left even when a pin is there', () => {
		const pins = [{ x: 280, y: 300 }];
		const [name] = layout([place('Wawa', undefined, 'left')], [{ x: 300, y: 300 }], pins);
		expect(name.textX + measure('Wawa')).toBeLessThan(300);
	});

	it('keeps a right-side name on the right even when a pin is there', () => {
		const pins = [{ x: 320, y: 300 }];
		const [name] = layout([place('Espanola', undefined, 'right')], [{ x: 300, y: 300 }], pins);
		expect(name.textX).toBeGreaterThan(300);
	});

	it('moves a name down by the number of text heights asked for', () => {
		const at = [{ x: 300, y: 300 }];
		const [level] = layout([place('Soo', undefined, 'left')], at);
		const [lower] = layout([place('Soo', undefined, 'left', 0.5)], at);
		expect(lower.textY - level.textY).toBe(6);
	});

	it('moves a name to the left when the right side runs off the map', () => {
		const [name] = layout([place('Thunder Bay')], [{ x: 980, y: 300 }]);
		expect(name.textX + measure('Thunder Bay')).toBeLessThan(980);
	});

	it('drops a name that would cover a pin, or another name, unless the place is kept', () => {
		const here = { x: 300, y: 300 };
		const pins = [
			{ x: 320, y: 300 },
			{ x: 280, y: 300 },
			{ x: 300, y: 282 },
			{ x: 300, y: 318 }
		];
		expect(layout([place('Dryden')], [here], pins)).toEqual([]);
		expect(layout([place('Dryden', true)], [here], pins)).toHaveLength(1);

		const twins = layout([place('A'), place('B')], [here, { x: 301, y: 300 }]);
		expect(twins.length).toBeLessThan(2);
	});

	it('names a place that is also a pin beside the pin, with no dot of its own', () => {
		const pin = { x: 400, y: 200 };
		const [name] = layout([place('Wawa', true)], [pin], [pin]);
		expect(name.hasPin).toBe(true);
		expect(name.textX).toBeGreaterThan(pin.x + 8);
	});

	it('skips a place that is off the map', () => {
		expect(layout([place('Ottawa')], [{ x: 1200, y: 300 }])).toEqual([]);
	});
});

describe('placesToName', () => {
	const towns = [place('Dryden'), place('Wawa')];
	const clients = [
		{ name: 'Wawa', longitude: 1, latitude: 1 },
		{ name: 'Gauthier', longitude: 2, latitude: 2 }
	];

	it('names only the chosen places until the map is zoomed in', () => {
		expect(placesToName(towns, clients, false)).toBe(towns);
	});

	it('adds the municipalities when zoomed in, without repeating a place', () => {
		const names = placesToName(towns, clients, true).map(({ name }) => name);
		expect(names).toEqual(['Dryden', 'Wawa', 'Gauthier']);
	});
});
