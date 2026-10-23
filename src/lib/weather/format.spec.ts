import { describe, it, expect } from 'vitest';
import { formatDegrees } from './format.js';

describe('formatDegrees', () => {
	it('rounds and uses a true minus sign for negatives', () => {
		expect(formatDegrees(5.6)).toBe('6°');
		expect(formatDegrees(-3.2)).toBe('−3°');
	});

	it('never shows negative zero', () => {
		expect(formatDegrees(-0.4)).toBe('0°');
		expect(formatDegrees(0)).toBe('0°');
	});
});
