import { formatClockTime } from '#lib/radar/format.js';
import type { ConditionKind } from '#lib/weather/conditionMix.js';
import { formatDegrees } from '#lib/weather/format.js';
import { moonPhase } from '#lib/weather/moon.js';
import { sunTimes } from '#lib/weather/sun.js';
import { localDate } from '#lib/weather/timeZone.js';
import type { FactInputs, TickerFact } from './facts.js';
import { MAX_ROAD_AGE_MS, MIN_TEMPERATURE_SITES, liveSites } from './live.js';
import { TIME_ZONE, decimal, formatTravelTime, number, plural } from './text.js';

const DAY_MS = 86_400_000;
const EARTH_CIRCUMFERENCE_KM = 40_075;

// --- The sun at the office ---------------------------------------------------------------

export function sunTimesFact(inputs: FactInputs): TickerFact | null {
	const today = localDate(new Date(inputs.now), TIME_ZONE);
	const times = sunTimes(
		inputs.office.latitude,
		inputs.office.longitude,
		today.year,
		today.month,
		today.day
	);
	if (!times) return null;
	return {
		id: 'sun-times',
		text: `The sun rises in ${inputs.office.city} at ${formatClockTime(times.sunrise, TIME_ZONE)} and sets at ${formatClockTime(times.sunset, TIME_ZONE)} today.`
	};
}

/** Minutes of daylight at the office on a local calendar day, or null when the sun does not set. */
function daylightMinutes(inputs: FactInputs, year: number, month: number, day: number) {
	const times = sunTimes(inputs.office.latitude, inputs.office.longitude, year, month, day);
	return times && (times.sunset.getTime() - times.sunrise.getTime()) / 60_000;
}

/**
 * The longest day (June) or shortest day (December) of a year. Around the solstice the day length
 * barely changes, so every day within a minute of the extreme counts, and the one nearest the
 * 21st wins, which is the date people expect.
 */
function extremeDay(inputs: FactInputs, year: number, kind: 'longest' | 'shortest') {
	const month = kind === 'longest' ? 6 : 12;
	const days: { day: number; minutes: number }[] = [];
	for (let day = 15; day <= 28; day++) {
		const minutes = daylightMinutes(inputs, year, month, day);
		if (minutes !== null) days.push({ day, minutes });
	}
	if (days.length === 0) return null;
	const extreme = Math[kind === 'longest' ? 'max' : 'min'](...days.map(({ minutes }) => minutes));
	const [best] = days
		.filter(({ minutes }) => Math.abs(minutes - extreme) <= 1)
		.sort((a, b) => Math.abs(a.day - 21) - Math.abs(b.day - 21) || a.day - b.day);
	return { kind, year, month, ...best };
}

const dateFormat = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'UTC',
	month: 'long',
	day: 'numeric'
});

/** How far off the shortest or longest day of the year is, whichever comes next. */
export function solsticeFact(inputs: FactInputs): TickerFact | null {
	const today = localDate(new Date(inputs.now), TIME_ZONE);
	const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
	const upcoming = [today.year, today.year + 1]
		.flatMap((year) => [extremeDay(inputs, year, 'longest'), extremeDay(inputs, year, 'shortest')])
		.flatMap((extreme) => {
			if (!extreme) return [];
			const at = Date.UTC(extreme.year, extreme.month - 1, extreme.day);
			return at >= todayUtc ? [{ ...extreme, at }] : [];
		})
		.sort((a, b) => a.at - b.at)[0];
	if (!upcoming) return null;

	const days = Math.round((upcoming.at - todayUtc) / DAY_MS);
	const daylight = formatTravelTime(Math.round(upcoming.minutes));
	const when = dateFormat.format(upcoming.at);
	return {
		id: 'solstice',
		text:
			days === 0
				? `Today is the ${upcoming.kind} day of the year in ${inputs.office.city}, with ${daylight} of daylight.`
				: `${plural(days, 'day')} until the ${upcoming.kind} day of the year in ${inputs.office.city}, ${when}, with ${daylight} of daylight.`
	};
}

// --- The moon ----------------------------------------------------------------------------

/** How the moon looks at each stretch of its cycle, from `phase` 0 (new) round to 1. */
const MOON_PHRASES: [upTo: number, phrase: string][] = [
	[0.03, 'new'],
	[0.22, 'a waxing crescent'],
	[0.28, 'at first quarter'],
	[0.47, 'a waxing gibbous'],
	[0.53, 'full'],
	[0.72, 'a waning gibbous'],
	[0.78, 'at last quarter'],
	[0.97, 'a waning crescent'],
	[1, 'new']
];

export function moonPhaseFact(inputs: FactInputs): TickerFact {
	const phase = moonPhase(new Date(inputs.now));
	const phrase = MOON_PHRASES.find(([upTo]) => phase <= upTo)![1];
	const lit = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);
	return { id: 'moon-phase', text: `The moon is ${phrase} tonight, ${lit}% lit.` };
}

/** When the moon next reaches a phase (0 new, 0.5 full), found by stepping and then halving. */
function nextPhaseAt(now: number, target: 0 | 0.5): number | null {
	// Distance from the target phase, from -0.5 to 0.5; it goes from below zero to above it at the moment.
	const offset = (time: number) => {
		const gap = moonPhase(new Date(time)) - target;
		return gap - Math.round(gap);
	};
	const STEP = 6 * 3_600_000;
	for (let time = now; time < now + 32 * DAY_MS; time += STEP) {
		if (offset(time) < 0 && offset(time + STEP) >= 0) {
			let [low, high] = [time, time + STEP];
			while (high - low > 60_000) {
				const middle = (low + high) / 2;
				if (offset(middle) < 0) low = middle;
				else high = middle;
			}
			return high;
		}
	}
	return null;
}

const longDate = new Intl.DateTimeFormat('en-CA', {
	timeZone: TIME_ZONE,
	weekday: 'long',
	month: 'long',
	day: 'numeric'
});

export function nextMoonFact(inputs: FactInputs, which: 'full' | 'new'): TickerFact | null {
	const at = nextPhaseAt(inputs.now, which === 'full' ? 0.5 : 0);
	if (at === null) return null;
	const days = Math.round((at - inputs.now) / DAY_MS);
	return {
		id: `next-${which}-moon`,
		text: `The next ${which} moon is ${longDate.format(at)}, ${days <= 0 ? 'tonight' : `in ${plural(days, 'day')}`}.`
	};
}

// --- How far it all stretches --------------------------------------------------------------

/** Straight line distance in kilometres between two points, from longitude and latitude. */
function distanceKm(a: { longitude: number; latitude: number }, b: typeof a): number {
	const rad = Math.PI / 180;
	const half =
		Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
		Math.cos(a.latitude * rad) *
			Math.cos(b.latitude * rad) *
			Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
	return 12742 * Math.asin(Math.sqrt(half));
}

/** Every drive from the office out to a municipality and back, laid end to end. */
export function allTripsFact(inputs: FactInputs): TickerFact | null {
	const trips = inputs.municipalities.map(({ name }) => inputs.trips[name]);
	if (trips.length === 0 || trips.some((trip) => !trip)) return null;
	const roundTripsKm = 2 * trips.reduce((sum, trip) => sum + trip.driveKm, 0);
	const aroundEarth = roundTripsKm / EARTH_CIRCUMFERENCE_KM;
	const compared =
		aroundEarth < 1
			? `${Math.round(aroundEarth * 100)}% of the way around the Earth`
			: `${decimal.format(aroundEarth)} times around the Earth`;
	return {
		id: 'all-trips',
		text: `Driving from ${inputs.office.city} to each of our ${inputs.municipalities.length} municipalities and back every time would be ${number.format(Math.round(roundTripsKm))} km, ${compared}.`
	};
}

/** The two municipalities furthest apart from east to west, or from north to south. */
export function spanFact(inputs: FactInputs, across: 'east-west' | 'north-south'): TickerFact {
	const key = across === 'east-west' ? 'longitude' : 'latitude';
	const sorted = [...inputs.municipalities].sort(
		(a, b) => a[key] - b[key] || a.name.localeCompare(b.name)
	);
	// Longitudes are negative, so the smallest is the west end; the smallest latitude is the south end.
	const [start, end] =
		across === 'east-west'
			? [sorted[sorted.length - 1], sorted[0]]
			: [sorted[0], sorted[sorted.length - 1]];
	const first = across === 'east-west' ? 'east' : 'south';
	const second = across === 'east-west' ? 'west' : 'north';
	return {
		id: `span-${across}`,
		text: `From ${start.name} in the ${first} to ${end.name} in the ${second}, our municipalities stretch about ${number.format(Math.round(distanceKm(start, end)))} km in a straight line.`
	};
}

// --- Roads ----------------------------------------------------------------------------------

function roadSectionCounts(inputs: FactInputs) {
	const snapshot = inputs.roadSections;
	if (!snapshot || snapshot.segments.length === 0) return null;
	if (inputs.now - snapshot.loadedAt > MAX_ROAD_AGE_MS) return null;
	const counts = { clear: 0, wet: 0, snow: 0, ice: 0 };
	for (const { status } of snapshot.segments) counts[status]++;
	return { counts, total: snapshot.segments.length };
}

export function roadWetFact(inputs: FactInputs): TickerFact | null {
	const found = roadSectionCounts(inputs);
	if (!found) return null;
	const { wet } = found.counts;
	return {
		id: 'road-wet',
		text:
			wet === 0
				? 'Ontario 511 shows no wet road sections right now.'
				: `${Math.round((wet / found.total) * 100)}% of the road sections Ontario 511 reports on are wet right now, ${number.format(wet)} of ${number.format(found.total)}.`
	};
}

export function roadHazardFact(inputs: FactInputs): TickerFact | null {
	const found = roadSectionCounts(inputs);
	if (!found) return null;
	const { snow, ice } = found.counts;
	return {
		id: 'road-hazard',
		text:
			snow + ice === 0
				? 'Ontario 511 reports no snow covered or icy road sections right now.'
				: `Ontario 511 reports ${plural(snow, 'snow covered road section')} and ${plural(ice, 'icy road section')} right now.`
	};
}

// --- Weather across the municipalities ------------------------------------------------------

const MIX_WORDS: Partial<Record<ConditionKind, string>> = {
	rain: 'rain',
	snow: 'snow',
	clear: 'clear skies'
};

/** How many of the municipalities with a reading have rain, snow or clear skies. Skipped at zero. */
export function mixFact(inputs: FactInputs, kind: 'rain' | 'snow' | 'clear'): TickerFact | null {
	const mix = inputs.weatherMix;
	if (!mix || mix.reporting === 0 || mix.counts[kind] === 0) return null;
	return {
		id: `mix-${kind}`,
		text: `${mix.counts[kind]} of the ${mix.reporting} municipalities with a current reading ${mix.counts[kind] === 1 ? 'has' : 'have'} ${MIX_WORDS[kind]} right now.`
	};
}

// --- Forecast extremes ----------------------------------------------------------------------

/**
 * The coldest forecast low or warmest forecast high, taken from the first period of that kind. Sites
 * can start on different periods, so only sites on the most common period are compared.
 */
export function forecastFact(inputs: FactInputs, kind: 'low' | 'high'): TickerFact | null {
	const picks = liveSites(inputs).flatMap(({ siteName, weather }) => {
		const period = weather?.forecast.find(
			(item) => item.temperatureKind === kind && typeof item.temperatureC === 'number'
		);
		return period ? [{ siteName, name: period.name, celsius: period.temperatureC! }] : [];
	});
	const byName = new Map<string, number>();
	for (const { name } of picks) byName.set(name, (byName.get(name) ?? 0) + 1);
	const [common] = [...byName].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))[0] ?? [];
	const sameDay = picks.filter(({ name }) => name === common);
	if (sameDay.length < MIN_TEMPERATURE_SITES) return null;

	const sign = kind === 'low' ? 1 : -1;
	sameDay.sort((a, b) => sign * (a.celsius - b.celsius) || a.siteName.localeCompare(b.siteName));
	const [extreme] = sameDay;
	return {
		id: `forecast-${kind}`,
		text: `${kind === 'low' ? 'Coldest' : 'Warmest'} forecast ${kind} (${common}): ${extreme.siteName}, ${formatDegrees(extreme.celsius)}.`
	};
}

// --- Radar ----------------------------------------------------------------------------------

/** A radar frame older than this is not stated as fact; frames come about every 6 minutes. */
const MAX_RADAR_AGE_MS = 30 * 60 * 1000;

function freshRadar(inputs: FactInputs) {
	const radar = inputs.radar;
	return radar && inputs.now - Date.parse(radar.observedAt) <= MAX_RADAR_AGE_MS ? radar : null;
}

/** How many municipalities the radar shows precipitation over. */
export function radarMunicipalitiesFact(inputs: FactInputs): TickerFact | null {
	const radar = freshRadar(inputs);
	if (!radar) return null;
	const total = inputs.municipalities.length;
	return {
		id: 'radar-municipalities',
		text:
			radar.wet.length === 0
				? 'Radar shows no precipitation over any of our municipalities right now.'
				: `Radar shows precipitation over ${radar.wet.length} of our ${total} municipalities right now.`
	};
}

/** The district with the most municipalities under precipitation. Ties go to the first name. */
export function radarDistrictFact(inputs: FactInputs): TickerFact | null {
	const radar = freshRadar(inputs);
	if (!radar || radar.wet.length === 0) return null;
	const wet = new Set(radar.wet);
	const counts = new Map<string, { wet: number; all: number }>();
	for (const { name } of inputs.municipalities) {
		const { district } = inputs.facts[name];
		const entry = counts.get(district) ?? { wet: 0, all: 0 };
		entry.all++;
		if (wet.has(name)) entry.wet++;
		counts.set(district, entry);
	}
	const [[district, { wet: under, all }]] = [...counts].sort(
		([a, x], [b, y]) => y.wet - x.wet || a.localeCompare(b)
	);
	return {
		id: 'radar-district',
		text: `The wettest district on radar right now is ${district}, with ${under} of its ${all} municipalities under precipitation.`
	};
}
