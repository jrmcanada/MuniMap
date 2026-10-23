import { describe, it, expect } from 'vitest';
import { formatClockTime } from '#lib/radar/format.js';
import { sunTimes } from './sun.js';
import { localDate } from './timeZone.js';

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

	it('puts both times on the date asked for, so the sun is up at midday', () => {
		// Ignace, 23 October: sunrise and sunset belong to that day, not the next.
		const times = sunTimes(49.42, -91.66, 2026, 10, 23)!;
		for (const moment of [times.sunrise, times.sunset]) {
			expect(localDate(moment, 'America/Winnipeg')).toEqual({ year: 2026, month: 10, day: 23 });
		}
		const midday = new Date(Date.UTC(2026, 9, 23, 17));
		expect(midday > times.sunrise && midday < times.sunset).toBe(true);
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
