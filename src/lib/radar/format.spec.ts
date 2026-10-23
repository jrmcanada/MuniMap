import { describe, it, expect } from 'vitest';
import { formatRadarTime } from './format.js';

describe('formatRadarTime', () => {
	it('shows Toronto time in lower case', () => {
		expect(formatRadarTime('2026-10-23T02:48:00Z')).toBe('10:48 pm');
		expect(formatRadarTime('2026-10-23T14:05:00Z')).toBe('10:05 am');
	});
});
