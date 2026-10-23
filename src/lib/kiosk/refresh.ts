const TIME_ZONE = 'America/Toronto';
const REFRESH_HOUR = 4;

/** The calendar date and clock time in Toronto at an instant. */
function torontoParts(ms: number) {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: TIME_ZONE,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
		hourCycle: 'h23'
	}).formatToParts(new Date(ms));
	const read = (type: string) => Number(parts.find((part) => part.type === type)!.value);
	return {
		year: read('year'),
		month: read('month'),
		day: read('day'),
		hour: read('hour'),
		minute: read('minute'),
		second: read('second')
	};
}

/** Toronto's offset from UTC at an instant, in milliseconds (negative: behind UTC). */
function offsetAt(ms: number): number {
	const { year, month, day, hour, minute, second } = torontoParts(ms);
	return Date.UTC(year, month - 1, day, hour, minute, second) - Math.floor(ms / 1000) * 1000;
}

/** The instant when Toronto's wall clock reads the refresh hour on a calendar day. */
function refreshInstant(year: number, month: number, day: number): number {
	const wall = Date.UTC(year, month - 1, day, REFRESH_HOUR);
	// A second pass settles the offset when the guess lands on the other side of a clock change.
	const guess = wall - offsetAt(wall);
	return wall - offsetAt(guess);
}

/**
 * Milliseconds until the next 4:00 am Toronto time. Daylight saving changes at 2:00 am, so 4:00 am
 * exists exactly once on every day, and the answer is right across both changes.
 */
export function msUntilNextRefresh(now: number): number {
	const today = torontoParts(now);
	let target = refreshInstant(today.year, today.month, today.day);
	if (target <= now) {
		const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
		target = refreshInstant(
			tomorrow.getUTCFullYear(),
			tomorrow.getUTCMonth() + 1,
			tomorrow.getUTCDate()
		);
	}
	return target - now;
}
