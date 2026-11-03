import { describe, it, expect } from 'vitest';
import { formatEventTime } from './format.js';

describe('formatEventTime', () => {
	it('writes the date and clock time in Toronto time', () => {
		// 18:32 UTC on 3 November 2026 is 1:32 pm in Toronto, once daylight saving has ended.
		expect(formatEventTime(Date.UTC(2026, 10, 3, 18, 32))).toMatch(/Nov\.? 3,? 1:32/);
	});
});
