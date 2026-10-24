import { describe, it, expect } from 'vitest';
import { landmarks } from './landmarks.js';
import { municipalities } from './municipalities.js';

describe('landmarks', () => {
	it('are each about a municipality we serve', () => {
		const names = new Set(municipalities.map(({ name }) => name));
		for (const { municipality } of landmarks) expect(names.has(municipality)).toBe(true);
	});

	it('have one line per municipality, short enough for the status bar', () => {
		const seen = landmarks.map(({ municipality }) => municipality);
		expect(new Set(seen).size).toBe(seen.length);
		for (const { text } of landmarks) expect(text.length).toBeLessThan(120);
	});
});
