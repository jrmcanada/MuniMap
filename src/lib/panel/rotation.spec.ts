import { describe, it, expect } from 'vitest';
import { Rotation } from './rotation.js';

const names = Array.from({ length: 50 }, (_, i) => `Town ${i}`);

describe('Rotation', () => {
	it('visits every name exactly once per lap', () => {
		const rotation = new Rotation(names);
		for (const lap of [0, 1, 2]) {
			const seen = Array.from({ length: 50 }, (_, i) => rotation.at(lap * 50 + i));
			expect(new Set(seen).size).toBe(50);
		}
	});

	it('answers the same for the same position', () => {
		const rotation = new Rotation(names);
		expect(rotation.at(73)).toBe(rotation.at(73));
	});

	it('never starts a lap with the name that ended the last one', () => {
		// A constant random source repeats the same shuffle, so the collision is forced.
		const rotation = new Rotation(['a', 'b', 'c'], () => 0);
		for (let lap = 1; lap < 6; lap++) {
			expect(rotation.at(lap * 3)).not.toBe(rotation.at(lap * 3 - 1));
		}
	});
});
