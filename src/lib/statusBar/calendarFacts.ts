import { localDate } from '#lib/weather/timeZone.js';
import type { FactInputs, TickerFact } from './facts.js';
import { TIME_ZONE, plural } from './text.js';

const DAY_MS = 86_400_000;

const dateFormat = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'UTC',
	weekday: 'long',
	month: 'long',
	day: 'numeric'
});

/** Today's local date as a UTC midnight, so days can be counted by subtraction. */
function todayUtc(inputs: FactInputs): number {
	const { year, month, day } = localDate(new Date(inputs.now), TIME_ZONE);
	return Date.UTC(year, month - 1, day);
}

/** The nth Sunday of a month (month 1 to 12), as a UTC midnight. */
function nthSunday(year: number, month: number, n: number): number {
	const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
	const firstSunday = 1 + ((7 - firstDay) % 7);
	return Date.UTC(year, month - 1, firstSunday + (n - 1) * 7);
}

// --- Clock changes -----------------------------------------------------------------------------

/** Days until the next change to or from daylight saving time: the second Sunday of March and the first of November. */
export function clockChangeFact(inputs: FactInputs): TickerFact | null {
	const today = todayUtc(inputs);
	const year = new Date(today).getUTCFullYear();
	const change = [
		{ at: nthSunday(year, 3, 2), direction: 'forward' },
		{ at: nthSunday(year, 11, 1), direction: 'back' },
		{ at: nthSunday(year + 1, 3, 2), direction: 'forward' }
	].find(({ at }) => at > today);
	if (!change) return null;

	const days = Math.round((change.at - today) / DAY_MS);
	return {
		id: 'clock-change',
		text:
			days === 1
				? `Clocks go ${change.direction} tonight, at 2 am.`
				: `Clocks go ${change.direction} in ${plural(days, 'day')}, on ${dateFormat.format(change.at)}, at 2 am.`
	};
}

// --- Holidays that fall on the same date every year --------------------------------------------

const HOLIDAYS = [
	{ name: 'Halloween', month: 10, day: 31 },
	{ name: 'Remembrance Day', month: 11, day: 11 },
	{ name: 'Christmas Day', month: 12, day: 25 },
	{ name: "New Year's Day", month: 1, day: 1 },
	{ name: "Valentine's Day", month: 2, day: 14 },
	{ name: 'Canada Day', month: 7, day: 1 }
];

/** The next holiday from the list (index 0), or the one after it (index 1). Today counts. */
export function holidayFact(inputs: FactInputs, index: 0 | 1): TickerFact | null {
	const today = todayUtc(inputs);
	const year = new Date(today).getUTCFullYear();
	const upcoming = [year, year + 1]
		.flatMap((y) =>
			HOLIDAYS.map(({ name, month, day }) => ({ name, at: Date.UTC(y, month - 1, day) }))
		)
		.filter(({ at }) => at >= today)
		.sort((a, b) => a.at - b.at)[index];
	if (!upcoming) return null;

	const days = Math.round((upcoming.at - today) / DAY_MS);
	return {
		id: `holiday-${index}`,
		text:
			days === 0
				? `Today is ${upcoming.name}.`
				: `${plural(days, 'day')} until ${upcoming.name}, ${dateFormat.format(upcoming.at)}.`
	};
}

// --- Time of day -------------------------------------------------------------------------------

export function greetingFact(inputs: FactInputs): TickerFact {
	const hour = Number(
		new Intl.DateTimeFormat('en-CA', {
			timeZone: TIME_ZONE,
			hour: 'numeric',
			hourCycle: 'h23'
		}).format(inputs.now)
	);
	const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
	const weekday = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, weekday: 'long' }).format(
		inputs.now
	);
	return { id: 'greeting', text: `Good ${part} from ${inputs.office.city}. Today is ${weekday}.` };
}
