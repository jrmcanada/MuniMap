import { formatClockTime } from '#lib/radar/format.js';
import { moonPass, nextMoonPass } from '#lib/weather/moon.js';
import { sunTimes } from '#lib/weather/sun.js';
import { localDate } from '#lib/weather/timeZone.js';
import type { FactInputs, TickerFact } from './facts.js';
import { TIME_ZONE, formatTravelTime } from './text.js';

/** "tomorrow " when a time falls on a later local day than `now`, otherwise nothing. */
function dayWord(time: Date, now: number): string {
	const [then, today] = [localDate(time, TIME_ZONE), localDate(new Date(now), TIME_ZONE)];
	return then.year === today.year && then.month === today.month && then.day === today.day
		? ''
		: 'tomorrow ';
}

/** When the moon next rises over the office, or sets if it is already up. */
export function moonriseFact(inputs: FactInputs): TickerFact | null {
	const { city, latitude, longitude } = inputs.office;
	const now = new Date(inputs.now);
	const up = moonPass(now, latitude, longitude);
	if (up) {
		return {
			id: 'moonrise',
			text: `The moon is up over ${city} now and sets ${dayWord(up.set, inputs.now)}at ${formatClockTime(up.set, TIME_ZONE)}.`
		};
	}
	const next = nextMoonPass(now, latitude, longitude);
	if (!next) return null;
	return {
		id: 'moonrise',
		text: `The moon rises in ${city} ${dayWord(next.rise, inputs.now)}at ${formatClockTime(next.rise, TIME_ZONE)}.`
	};
}

/** How long until sunrise or sunset at the office, or how long ago the sun set. */
export function sunCountdownFact(inputs: FactInputs): TickerFact | null {
	const today = localDate(new Date(inputs.now), TIME_ZONE);
	const { city, latitude, longitude } = inputs.office;
	const times = sunTimes(latitude, longitude, today.year, today.month, today.day);
	if (!times) return null;

	const minutes = (from: number, to: number) => Math.max(1, Math.round((to - from) / 60_000));
	const { now } = inputs;
	const text =
		now < times.sunrise.getTime()
			? `Sunrise in ${city} is in ${formatTravelTime(minutes(now, times.sunrise.getTime()))}.`
			: now < times.sunset.getTime()
				? `Sunset in ${city} is in ${formatTravelTime(minutes(now, times.sunset.getTime()))}.`
				: `The sun set in ${city} ${formatTravelTime(minutes(times.sunset.getTime(), now))} ago.`;
	return { id: 'sun-countdown', text };
}

/** One of the Ontario facts, picked at random. */
export function triviaFact(inputs: FactInputs): TickerFact | null {
	if (inputs.trivia.length === 0) return null;
	const index = Math.floor(inputs.random() * inputs.trivia.length);
	return { id: `trivia-${index}`, text: inputs.trivia[index].text };
}
