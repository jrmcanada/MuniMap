import { describe, it, expect } from 'vitest';
import { nearestPin } from './hit.js';

const pins = [
	{ x: 100, y: 100 },
	{ x: 110, y: 100 },
	{ x: 400, y: 300 }
];

describe('nearestPin', () => {
	it('finds the pin under the point', () => {
		expect(nearestPin(pins, { x: 402, y: 298 }, 16)).toBe(2);
	});

	it('picks the closest of several pins in range', () => {
		expect(nearestPin(pins, { x: 107, y: 100 }, 16)).toBe(1);
		expect(nearestPin(pins, { x: 102, y: 100 }, 16)).toBe(0);
	});

	it('returns -1 when nothing is within reach', () => {
		expect(nearestPin(pins, { x: 250, y: 200 }, 16)).toBe(-1);
		expect(nearestPin([], { x: 0, y: 0 }, 16)).toBe(-1);
	});
});
