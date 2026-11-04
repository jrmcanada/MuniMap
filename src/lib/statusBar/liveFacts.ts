import { formatClockTime } from '#lib/radar/format.js';
import { bearingOf } from '#lib/weather/compass.js';
import { formatDegrees } from '#lib/weather/format.js';
import type { CurrentConditions } from '#lib/weather/types.js';
import type { FactInputs, TickerFact } from './facts.js';
import {
	MAX_OBSERVATION_AGE_MS,
	MAX_ROAD_AGE_MS,
	MIN_TEMPERATURE_SITES,
	liveSites
} from './live.js';
import { TIME_ZONE, plural } from './text.js';

/** A radar frame older than this is not stated as fact; frames come about every 6 minutes. */
const MAX_RADAR_AGE_MS = 30 * 60 * 1000;
/** A freshness line still mentions a radar frame this old, so a stuck feed shows up on screen. */
const MAX_RADAR_MENTION_MS = 2 * 60 * 60 * 1000;
/** Feels-like must differ from the reading by at least this many degrees to be worth saying. */
const MIN_FEELS_GAP = 3;

interface Reading {
	siteName: string;
	current: CurrentConditions;
}

/** Current conditions from every forecast site whose reading was taken within the hour. */
function freshReadings(inputs: FactInputs): Reading[] {
	return liveSites(inputs).flatMap(({ siteName, weather }) => {
		const current = weather?.current;
		const observed = current ? Date.parse(current.observedAt) : NaN;
		return current && inputs.now - observed <= MAX_OBSERVATION_AGE_MS
			? [{ siteName, current }]
			: [];
	});
}

const byValueThenName = <T extends { siteName: string }>(
	items: T[],
	value: (item: T) => number,
	sign: 1 | -1
) =>
	[...items].sort((a, b) => sign * (value(a) - value(b)) || a.siteName.localeCompare(b.siteName));

// --- Temperature, wind and humidity ----------------------------------------------------------

export function belowFreezingFact(inputs: FactInputs): TickerFact | null {
	const readings = freshReadings(inputs);
	if (readings.length < MIN_TEMPERATURE_SITES) return null;
	const below = readings.filter(({ current }) => current.temperatureC < 0).length;
	return {
		id: 'below-freezing',
		text:
			below === 0
				? 'None of our weather stations is below freezing right now.'
				: `${below} of our ${readings.length} weather stations ${below === 1 ? 'is' : 'are'} below freezing right now.`
	};
}

/** Wind in km/h, counting the feed's word for no wind as zero. */
const windKmh = ({ windSpeedKmh }: CurrentConditions) =>
	windSpeedKmh === 'calm' ? 0 : windSpeedKmh;

export function calmestFact(inputs: FactInputs): TickerFact | null {
	const readings = freshReadings(inputs).flatMap(({ siteName, current }) => {
		const kmh = windKmh(current);
		return typeof kmh === 'number' ? [{ siteName, kmh }] : [];
	});
	if (readings.length < MIN_TEMPERATURE_SITES) return null;
	const [calmest] = byValueThenName(readings, ({ kmh }) => kmh, 1);
	return {
		id: 'calmest',
		text: `Calmest spot right now: ${calmest.siteName}, ${calmest.kmh === 0 ? 'with no wind' : `with winds at ${Math.round(calmest.kmh)} km/h`}.`
	};
}

export function mostHumidFact(inputs: FactInputs): TickerFact | null {
	const readings = freshReadings(inputs).flatMap(({ siteName, current }) =>
		typeof current.humidityPercent === 'number'
			? [{ siteName, humidity: current.humidityPercent }]
			: []
	);
	if (readings.length < MIN_TEMPERATURE_SITES) return null;
	const [muggiest] = byValueThenName(readings, ({ humidity }) => humidity, -1);
	return {
		id: 'most-humid',
		text: `Most humid spot right now: ${muggiest.siteName}, at ${Math.round(muggiest.humidity)}% humidity.`
	};
}

const WIND_FROM = [
	'north',
	'northeast',
	'east',
	'southeast',
	'south',
	'southwest',
	'west',
	'northwest'
];

/** The compass direction most stations report the wind coming from. */
export function windDirectionFact(inputs: FactInputs): TickerFact | null {
	const counts = new Array<number>(WIND_FROM.length).fill(0);
	let total = 0;
	for (const { current } of freshReadings(inputs)) {
		const bearing = bearingOf(current.windDirection);
		const kmh = windKmh(current);
		if (bearing === null || typeof kmh !== 'number' || kmh <= 0) continue;
		counts[Math.round(bearing / 45) % 8]++;
		total++;
	}
	if (total < MIN_TEMPERATURE_SITES) return null;
	const top = counts.indexOf(Math.max(...counts));
	return {
		id: 'wind-direction',
		text: `Winds are mostly from the ${WIND_FROM[top]} at ${counts[top]} of ${total} weather stations.`
	};
}

export function feelsLikeFact(inputs: FactInputs): TickerFact | null {
	const gaps = freshReadings(inputs).flatMap(({ siteName, current }) =>
		typeof current.feelsLikeC === 'number'
			? [
					{
						siteName,
						reads: current.temperatureC,
						feels: current.feelsLikeC,
						gap: current.temperatureC - current.feelsLikeC
					}
				]
			: []
	);
	const [biggest] = byValueThenName(gaps, ({ gap }) => gap, -1);
	if (!biggest || biggest.gap < MIN_FEELS_GAP) return null;
	return {
		id: 'feels-like',
		text: `It feels ${Math.round(biggest.gap)}° colder than it reads in ${biggest.siteName}: ${formatDegrees(biggest.reads)}, feels like ${formatDegrees(biggest.feels)}.`
	};
}

// --- How fresh the data is --------------------------------------------------------------------

const minutesAgo = (now: number, then: number) => {
	const minutes = Math.max(0, Math.round((now - then) / 60_000));
	return minutes === 0 ? 'under a minute ago' : `${plural(minutes, 'minute')} ago`;
};

/** When each live source last updated, so a stuck feed shows up on the wall. */
export function freshnessFact(inputs: FactInputs): TickerFact | null {
	const parts: string[] = [];
	const fetched = liveSites(inputs).flatMap(({ weather }) => (weather ? [weather.fetchedAt] : []));
	if (fetched.length > 0)
		parts.push(`weather updated ${minutesAgo(inputs.now, Math.max(...fetched))}`);

	const frame = inputs.radar && Date.parse(inputs.radar.observedAt);
	if (frame && inputs.now - frame <= MAX_RADAR_MENTION_MS) {
		parts.push(`radar frame from ${formatClockTime(inputs.radar!.observedAt, TIME_ZONE)}`);
	}
	if (inputs.roadSections && inputs.now - inputs.roadSections.loadedAt <= MAX_ROAD_AGE_MS) {
		parts.push(`road conditions updated ${minutesAgo(inputs.now, inputs.roadSections.loadedAt)}`);
	}
	if (parts.length === 0) return null;
	const text = parts.join('; ');
	return { id: 'freshness', text: `${text.charAt(0).toUpperCase()}${text.slice(1)}.` };
}

// --- Roads ------------------------------------------------------------------------------------

/** The road with the most events held, from the closures, collisions and road-shutting roadwork shown. */
export function busiestRoadFact(inputs: FactInputs): TickerFact | null {
	const snapshot = inputs.roadEvents;
	if (!snapshot || inputs.now - snapshot.loadedAt > MAX_ROAD_AGE_MS) return null;
	const counts = new Map<string, number>();
	for (const { roadway } of snapshot.events) {
		const name = roadway.trim();
		if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	const [top] = [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
	if (!top || top[1] < 2) return null;
	return {
		id: 'busiest-road',
		text: `${top[0]} has the most closures, collisions and road-shutting roadwork reported right now: ${top[1]}.`
	};
}

// --- Radar ------------------------------------------------------------------------------------

function freshRadar(inputs: FactInputs) {
	const radar = inputs.radar;
	return radar && inputs.now - Date.parse(radar.observedAt) <= MAX_RADAR_AGE_MS ? radar : null;
}

/** Whether precipitation is over the Sudbury office itself. */
export function radarOfficeFact(inputs: FactInputs): TickerFact | null {
	const radar = freshRadar(inputs);
	if (!radar) return null;
	return {
		id: 'radar-office',
		text: radar.officeWet
			? `Radar shows precipitation over our ${inputs.office.city} office right now.`
			: `Radar shows our ${inputs.office.city} office dry right now.`
	};
}

/** The biggest district, of two or more municipalities, with none under precipitation. */
export function radarDryDistrictFact(inputs: FactInputs): TickerFact | null {
	const radar = freshRadar(inputs);
	if (!radar) return null;
	const wet = new Set(radar.wet);
	const counts = new Map<string, { wet: number; all: number }>();
	for (const { name } of inputs.municipalities) {
		const { district } = inputs.facts[name];
		const entry = counts.get(district) ?? { wet: 0, all: 0 };
		entry.all++;
		if (wet.has(name)) entry.wet++;
		counts.set(district, entry);
	}
	const [dry] = [...counts]
		.filter(([, { wet: under, all }]) => under === 0 && all >= 2)
		.sort(([a, x], [b, y]) => y.all - x.all || a.localeCompare(b));
	if (!dry) return null;
	return {
		id: 'radar-dry-district',
		text: `${dry[0]} is dry on radar right now, with none of its ${dry[1].all} municipalities under precipitation.`
	};
}
