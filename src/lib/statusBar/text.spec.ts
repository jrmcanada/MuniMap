import { describe, it, expect } from 'vitest';
import { listNames } from './text.js';

describe('listNames', () => {
	it('joins one or two names without a comma', () => {
		expect(listNames(['Dawson'])).toBe('Dawson');
		expect(listNames(['Dawson', 'Ignace'])).toBe('Dawson and Ignace');
	});

	it('puts the Oxford comma before the last of three names, or before the count of the rest', () => {
		expect(listNames(['Dawson', 'Ignace', 'Lake of the Woods'])).toBe(
			'Dawson, Ignace, and Lake of the Woods'
		);
		expect(listNames(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, and 3 more');
	});
});
