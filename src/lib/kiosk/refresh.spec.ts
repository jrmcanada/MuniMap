import { describe, it, expect } from 'vitest';
import { msUntilNextRefresh } from './refresh.js';

const HOUR = 60 * 60 * 1000;
const at = (iso: string) => Date.parse(iso);

describe('msUntilNextRefresh', () => {
	it('counts to 4:00 am the same night', () => {
		// 01:00 EDT on 23 October is 05:00 UTC; 4:00 am EDT is 08:00 UTC.
		expect(msUntilNextRefresh(at('2026-10-23T05:00:00Z'))).toBe(3 * HOUR);
	});

	it('counts to 4:00 am the next morning once it has passed', () => {
		expect(msUntilNextRefresh(at('2026-10-23T09:00:00Z'))).toBe(23 * HOUR);
	});

	it('goes to the next day at exactly 4:00 am', () => {
		expect(msUntilNextRefresh(at('2026-10-23T08:00:00Z'))).toBe(24 * HOUR);
	});

	it('is right across the fall back, when 1 November has an extra hour', () => {
		// 05:00 EDT on 31 October to 04:00 EST on 1 November. The clocks go back at 2:00 am, so the
		// wall clock covers 23 hours but 24 hours really pass.
		expect(msUntilNextRefresh(at('2026-10-31T09:00:00Z'))).toBe(24 * HOUR);
		// 01:30 EDT on 1 November is the first 1:30 of the night; 4:00 am EST is 09:00 UTC.
		expect(msUntilNextRefresh(at('2026-11-01T05:30:00Z'))).toBe(3.5 * HOUR);
		// The second 1:30 (EST) is an hour later in UTC, so it is 2.5 hours from 4:00 am.
		expect(msUntilNextRefresh(at('2026-11-01T06:30:00Z'))).toBe(2.5 * HOUR);
	});

	it('is right across the spring forward, when the night is an hour short', () => {
		// 05:00 EST on 7 March to 04:00 EDT on 8 March.
		expect(msUntilNextRefresh(at('2026-03-07T10:00:00Z'))).toBe(22 * HOUR);
		// 01:00 EST on 8 March, before the change, to 04:00 EDT (08:00 UTC).
		expect(msUntilNextRefresh(at('2026-03-08T06:00:00Z'))).toBe(2 * HOUR);
	});
});
