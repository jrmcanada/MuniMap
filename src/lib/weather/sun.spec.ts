import { describe, it, expect } from 'vitest';
import { formatClockTime } from '#lib/radar/format.js';
import { sunTimes } from './sun.js';

const minutes = (clock: string) => {
	const [time, meridian] = clock.split(' ');
	const [hour, minute] = time.split(':').map(Number);
	return ((hour % 12) + (meridian === 'pm' ? 12 : 0)) * 60 + minute;
};

describe('sunTimes', () => {
	it('puts Toronto sunrise and sunset on 21 June close to the published times', () => {
		const times = sunTimes(43.65, -79.38, 2026, 6, 21)!;
		const sunrise = minutes(formatClockTime(times.sunrise, 'America/Toronto'));
		const sunset = minutes(formatClockTime(times.sunset, 'America/Toronto'));
		// Published: 5:36 am and 9:02 pm Eastern. A few minutes either way is fine.
		expect(Math.abs(sunrise - minutes('5:36 am'))).toBeLessThanOrEqual(3);
		expect(Math.abs(sunset - minutes('9:02 pm'))).toBeLessThanOrEqual(3);
	});

	it('gives a longer day in June than in December', () => {
		const length = (month: number) => {
			const times = sunTimes(47.99, -84.77, 2026, month, 21)!;
			return times.sunset.getTime() - times.sunrise.getTime();
		};
		expect(length(6)).toBeGreaterThan(length(12));
	});

	it('returns null where the sun does not rise', () => {
		expect(sunTimes(80, 0, 2026, 12, 21)).toBeNull();
	});
});
