import type { MunicipalityFacts } from '#lib/data/facts.js';
import type { Landmark } from '#lib/data/landmarks.js';
import type { Municipality } from '#lib/data/municipalities.js';
import { formatDegrees } from '#lib/weather/format.js';
import { sunTimes } from '#lib/weather/sun.js';
import { localDate } from '#lib/weather/timeZone.js';
import type { SiteWeather } from '#lib/weather/types.js';

export interface TickerFact {
	id: string;
	text: string;
}

/** Driving distance from the office to one municipality, from scripts/build-office-trips.mjs. */
export interface OfficeTrip {
	driveKm: number;
}

export interface FactInputs {
	municipalities: Municipality[];
	/** The company office the travel and daylight facts are measured from. */
	office: { city: string; longitude: number; latitude: number };
	/** Trip from the office to each municipality, by municipality name. */
	trips: Record<string, OfficeTrip>;
	/** Remarkable things about individual municipalities; one is chosen at random per slot. */
	landmarks: Landmark[];
	/** A number from 0 up to but not including 1; picks the municipality in the travel facts. */
	random: () => number;
	facts: Record<string, MunicipalityFacts>;
	/** Weather held for a forecast site, already filtered for age and expired warnings. */
	peekWeather: (siteId: string) => SiteWeather | null;
	customMessages: string[];
	/** Epoch milliseconds. */
	now: number;
}

/** "Right now" facts ignore weather older than this. */
const MAX_LIVE_AGE_MS = 60 * 60 * 1000;
/** Below this many sites, "warmest" and "coldest" would just be the first ones to load. */
const MIN_TEMPERATURE_SITES = 8;
const WALKING_KMH = 5;
const CYCLING_KMH = 20;
/** Driving time is worked out at this steady speed, not taken from the routing service. */
const DRIVING_KMH = 100;

const travelMinutes = (km: number, kmh: number) => (km / kmh) * 60;
/** Land area of the City of Toronto, 2021 census, for scale. */
const TORONTO_KM2 = 631;
const TIME_ZONE = 'America/Toronto';

const number = new Intl.NumberFormat('en-CA');
const decimal = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 });

type NumericKey = 'population' | 'populationChangePercent' | 'landAreaKm2' | 'densityPerKm2';

/** The municipality with the highest or lowest value. Ties go to the first name alphabetically. */
function extreme(
	inputs: FactInputs,
	key: NumericKey,
	direction: 'highest' | 'lowest'
): { name: string; value: number } {
	const sign = direction === 'highest' ? -1 : 1;
	const [first] = inputs.municipalities
		.map(({ name }) => ({ name, value: inputs.facts[name][key] }))
		.sort((a, b) => sign * (a.value - b.value) || a.name.localeCompare(b.name));
	return first;
}

/**
 * Forecast sites in use, each with the weather held for it. The cache already drops anything
 * fetched over 2 hours ago; "right now" facts are stricter and want a fetch within the hour.
 */
function liveSites(
	inputs: FactInputs
): { siteId: string; siteName: string; weather: SiteWeather | null }[] {
	const sites = new Map<string, string>();
	for (const { name } of inputs.municipalities) {
		const { siteId, siteName } = inputs.facts[name];
		sites.set(siteId, siteName);
	}
	return [...sites].map(([siteId, siteName]) => {
		const weather = inputs.peekWeather(siteId);
		const fresh = weather && inputs.now - weather.fetchedAt <= MAX_LIVE_AGE_MS;
		return { siteId, siteName, weather: fresh ? weather : null };
	});
}

function warmestAndColdest(inputs: FactInputs): TickerFact | null {
	const readings = liveSites(inputs).flatMap(({ siteName, weather }) => {
		const current = weather?.current;
		const observed = current ? Date.parse(current.observedAt) : NaN;
		return current && inputs.now - observed <= MAX_LIVE_AGE_MS
			? [{ siteName, celsius: current.temperatureC }]
			: [];
	});
	if (readings.length < MIN_TEMPERATURE_SITES) return null;

	readings.sort((a, b) => a.celsius - b.celsius || a.siteName.localeCompare(b.siteName));
	const coldest = readings[0];
	// Sorted by temperature then name, so the first reading at the top temperature is the
	// alphabetical tie winner.
	const warmest = readings.find(
		(reading) => reading.celsius === readings[readings.length - 1].celsius
	)!;
	if (formatDegrees(warmest.celsius) === formatDegrees(coldest.celsius)) return null;
	return {
		id: 'temperatures',
		text: `Warmest reading right now: ${warmest.siteName}, ${formatDegrees(warmest.celsius)}. Coldest: ${coldest.siteName}, ${formatDegrees(coldest.celsius)}.`
	};
}

/** Counts municipalities, since one site's alert applies to every municipality using it. */
function alerts(inputs: FactInputs): TickerFact | null {
	const sites = liveSites(inputs);
	// "No alerts" would be false if some sites are missing or out of date.
	if (sites.some(({ weather }) => weather === null)) return null;

	const alerted = new Set(
		sites
			.filter(({ weather }) => weather!.warnings.some((warning) => warning.level !== 'other'))
			.map(({ siteId }) => siteId)
	);
	const affected = inputs.municipalities.filter(({ name }) =>
		alerted.has(inputs.facts[name].siteId)
	).length;
	return {
		id: 'alerts',
		text:
			affected === 0
				? 'No weather alerts for any of our municipalities.'
				: `Weather alerts are in effect for ${affected} of our municipalities.`
	};
}

function largestFact(inputs: FactInputs): TickerFact {
	const largest = extreme(inputs, 'population', 'highest');
	return {
		id: 'largest',
		text: `${largest.name} is our largest municipality, with ${number.format(largest.value)} people in the 2021 census.`
	};
}

function smallestFact(inputs: FactInputs): TickerFact {
	const smallest = extreme(inputs, 'population', 'lowest');
	return {
		id: 'smallest',
		text: `${smallest.name} is our smallest, with ${number.format(smallest.value)} people in the 2021 census.`
	};
}

function growthFact(inputs: FactInputs): TickerFact {
	const fastest = extreme(inputs, 'populationChangePercent', 'highest');
	return {
		id: 'growth',
		text: `${fastest.name} grew fastest between the 2016 and 2021 censuses, up ${decimal.format(fastest.value)}%.`
	};
}

function areaFact(inputs: FactInputs): TickerFact {
	const biggest = extreme(inputs, 'landAreaKm2', 'highest');
	return {
		id: 'area',
		text: `${biggest.name} covers ${number.format(Math.round(biggest.value))} km², the most of any municipality we serve.`
	};
}

function reachFact(inputs: FactInputs): TickerFact {
	const areas = new Set(inputs.municipalities.map(({ name }) => inputs.facts[name].district));
	const people = inputs.municipalities.reduce(
		(sum, { name }) => sum + inputs.facts[name].population,
		0
	);
	return {
		id: 'reach',
		text: `We serve ${inputs.municipalities.length} municipalities across ${areas.size} districts and counties, home to ${number.format(people)} people.`
	};
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const unit = (count: number, word: string, compound: boolean) =>
	compound ? `${count} ${word}` : plural(count, word);

/**
 * "2 hours 15 minutes" for a short trip, "11.4 days" for one so long it reads better that way.
 * `compound` gives "2 hour 15 minute", for use before a noun as in "a 2 hour 15 minute drive".
 */
function formatTravelTime(minutes: number, compound = false): string {
	if (minutes >= 48 * 60) return `${decimal.format(minutes / (24 * 60))} days`;
	const hours = Math.floor(minutes / 60);
	const rest = Math.round(minutes % 60);
	if (hours === 0) return unit(rest, 'minute', compound);
	const hoursText = unit(hours, 'hour', compound);
	return rest === 0 ? hoursText : `${hoursText} ${unit(rest, 'minute', compound)}`;
}

/** A municipality chosen at random, from those with a known trip from the office. */
function randomTrip(inputs: FactInputs): { name: string; trip: OfficeTrip } | null {
	const known = inputs.municipalities.filter(({ name }) => inputs.trips[name]);
	if (known.length === 0) return null;
	const { name } = known[Math.floor(inputs.random() * known.length)];
	return { name, trip: inputs.trips[name] };
}

function driveFact(inputs: FactInputs): TickerFact | null {
	const pick = randomTrip(inputs);
	if (!pick) return null;
	return {
		id: 'drive',
		text: `It's about a ${formatTravelTime(travelMinutes(pick.trip.driveKm, DRIVING_KMH), true)} drive from our ${inputs.office.city} office to ${pick.name}, ${number.format(Math.round(pick.trip.driveKm))} km by road.`
	};
}

function cycleFact(inputs: FactInputs): TickerFact | null {
	const pick = randomTrip(inputs);
	if (!pick) return null;
	const minutes = travelMinutes(pick.trip.driveKm, CYCLING_KMH);
	return {
		id: 'cycle',
		text: `Cycling from our ${inputs.office.city} office to ${pick.name} would take about ${formatTravelTime(minutes)} at ${CYCLING_KMH} km/h, without stopping.`
	};
}

function walkFact(inputs: FactInputs): TickerFact | null {
	const pick = randomTrip(inputs);
	if (!pick) return null;
	const minutes = travelMinutes(pick.trip.driveKm, WALKING_KMH);
	return {
		id: 'walk',
		text: `Walking from our ${inputs.office.city} office to ${pick.name} would take about ${formatTravelTime(minutes)} at ${WALKING_KMH} km/h, without a break.`
	};
}

/** The municipality with the longest or shortest drive from the office. Ties go to the first name. */
function byDistance(
	inputs: FactInputs,
	direction: 'farthest' | 'closest'
): { name: string; trip: OfficeTrip } | null {
	const sign = direction === 'farthest' ? -1 : 1;
	const [first] = inputs.municipalities
		.filter(({ name }) => inputs.trips[name])
		.sort(
			(a, b) =>
				sign * (inputs.trips[a.name].driveKm - inputs.trips[b.name].driveKm) ||
				a.name.localeCompare(b.name)
		);
	return first ? { name: first.name, trip: inputs.trips[first.name] } : null;
}

function farthestFact(inputs: FactInputs): TickerFact | null {
	const farthest = byDistance(inputs, 'farthest');
	if (!farthest) return null;
	const { driveKm } = farthest.trip;
	return {
		id: 'farthest',
		text: `${farthest.name} is the farthest of our municipalities from ${inputs.office.city}: ${number.format(Math.round(driveKm))} km, about a ${formatTravelTime(travelMinutes(driveKm, DRIVING_KMH), true)} drive.`
	};
}

function closestFact(inputs: FactInputs): TickerFact | null {
	const closest = byDistance(inputs, 'closest');
	if (!closest) return null;
	const { driveKm } = closest.trip;
	return {
		id: 'closest',
		text: `${closest.name} is the closest to our ${inputs.office.city} office: ${number.format(Math.round(driveKm))} km, about a ${formatTravelTime(travelMinutes(driveKm, DRIVING_KMH), true)} drive.`
	};
}

type Direction = 'north' | 'south' | 'east' | 'west';

/** The municipality furthest in a compass direction, with its position in degrees. */
function compassFact(inputs: FactInputs, direction: Direction): TickerFact {
	const key = direction === 'north' || direction === 'south' ? 'latitude' : 'longitude';
	const sign = direction === 'north' || direction === 'east' ? -1 : 1;
	const [first] = [...inputs.municipalities].sort(
		(a, b) => sign * (a[key] - b[key]) || a.name.localeCompare(b.name)
	);
	const degrees = Math.abs(first[key]).toFixed(1);
	// Every municipality is in the northern and western hemispheres.
	const hemisphere = key === 'latitude' ? 'N' : 'W';
	return {
		id: direction,
		text: `${first.name} is our ${direction}ernmost municipality, at ${degrees}° ${hemisphere}.`
	};
}

function densestFact(inputs: FactInputs): TickerFact {
	const densest = extreme(inputs, 'densityPerKm2', 'highest');
	return {
		id: 'densest',
		text: `${densest.name} is our most crowded municipality, with ${decimal.format(densest.value)} people per km².`
	};
}

function sparsestFact(inputs: FactInputs): TickerFact {
	const sparsest = extreme(inputs, 'densityPerKm2', 'lowest');
	return {
		id: 'sparsest',
		text: `${sparsest.name} has the most elbow room, with ${decimal.format(sparsest.value)} people per km².`
	};
}

function declineFact(inputs: FactInputs): TickerFact | null {
	const biggest = extreme(inputs, 'populationChangePercent', 'lowest');
	if (biggest.value >= 0) return null;
	return {
		id: 'decline',
		text: `${biggest.name} saw the biggest dip between the 2016 and 2021 censuses, down ${decimal.format(Math.abs(biggest.value))}%.`
	};
}

function smallestAreaFact(inputs: FactInputs): TickerFact {
	const smallest = extreme(inputs, 'landAreaKm2', 'lowest');
	return {
		id: 'smallest-area',
		text: `${smallest.name} is our most compact municipality, at just ${decimal.format(smallest.value)} km².`
	};
}

function torontoFact(inputs: FactInputs): TickerFact {
	const total = inputs.municipalities.reduce(
		(sum, { name }) => sum + inputs.facts[name].landAreaKm2,
		0
	);
	return {
		id: 'toronto',
		text: `Together our municipalities cover ${number.format(Math.round(total))} km², about ${number.format(Math.round(total / TORONTO_KM2))} times the size of the City of Toronto.`
	};
}

function longestNameFact(inputs: FactInputs): TickerFact {
	const [longest] = [...inputs.municipalities].sort(
		(a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name)
	);
	return {
		id: 'longest-name',
		text: `${longest.name} has the longest name of our municipalities, at ${longest.name.length} letters and spaces.`
	};
}

function busiestDistrictFact(inputs: FactInputs): TickerFact {
	const counts = new Map<string, number>();
	for (const { name } of inputs.municipalities) {
		const { district } = inputs.facts[name];
		counts.set(district, (counts.get(district) ?? 0) + 1);
	}
	const [[district, count]] = [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
	return {
		id: 'busiest-district',
		text: `${district} is home to more of our municipalities than any other: ${count} of ${inputs.municipalities.length}.`
	};
}

function growingFact(inputs: FactInputs): TickerFact {
	const grew = inputs.municipalities.filter(
		({ name }) => inputs.facts[name].populationChangePercent > 0
	).length;
	return {
		id: 'growing',
		text: `${grew} of our ${inputs.municipalities.length} municipalities grew between the 2016 and 2021 censuses.`
	};
}

function sizeGapFact(inputs: FactInputs): TickerFact {
	const largest = extreme(inputs, 'population', 'highest');
	const smallest = extreme(inputs, 'population', 'lowest');
	return {
		id: 'size-gap',
		text: `${largest.name} has about ${number.format(Math.round(largest.value / smallest.value))} times the people of ${smallest.name}, our smallest.`
	};
}

/** Daylight at the office today, and how it compares with yesterday. */
function daylightFact(inputs: FactInputs): TickerFact | null {
	const today = localDate(new Date(inputs.now), TIME_ZONE);
	// Date.UTC rolls a day of 0 back into the previous month.
	const before = new Date(Date.UTC(today.year, today.month - 1, today.day - 1));
	const length = (year: number, month: number, day: number) => {
		const times = sunTimes(inputs.office.latitude, inputs.office.longitude, year, month, day);
		return times && (times.sunset.getTime() - times.sunrise.getTime()) / 60_000;
	};
	const now = length(today.year, today.month, today.day);
	const earlier = length(before.getUTCFullYear(), before.getUTCMonth() + 1, before.getUTCDate());
	if (now === null || earlier === null) return null;

	const change = Math.round(now) - Math.round(earlier);
	const trend =
		change === 0
			? ''
			: `, ${plural(Math.abs(change), 'minute')} ${change > 0 ? 'more' : 'less'} than yesterday`;
	return {
		id: 'daylight',
		text: `${inputs.office.city} gets ${formatTravelTime(Math.round(now))} of daylight today${trend}.`
	};
}

function windiest(inputs: FactInputs): TickerFact | null {
	const readings = liveSites(inputs).flatMap(({ siteName, weather }) => {
		const current = weather?.current;
		const observed = current ? Date.parse(current.observedAt) : NaN;
		return typeof current?.windSpeedKmh === 'number' && inputs.now - observed <= MAX_LIVE_AGE_MS
			? [{ siteName, kmh: current.windSpeedKmh }]
			: [];
	});
	if (readings.length < MIN_TEMPERATURE_SITES) return null;
	readings.sort((a, b) => b.kmh - a.kmh || a.siteName.localeCompare(b.siteName));
	const [windiest] = readings;
	if (windiest.kmh <= 0) return null;
	return {
		id: 'wind',
		text: `Windiest spot right now: ${windiest.siteName}, with winds at ${Math.round(windiest.kmh)} km/h.`
	};
}

function landmarkFact(inputs: FactInputs): TickerFact | null {
	if (inputs.landmarks.length === 0) return null;
	const pick = inputs.landmarks[Math.floor(inputs.random() * inputs.landmarks.length)];
	return { id: `landmark-${pick.municipality}`, text: pick.text };
}

const RADAR_FACT: TickerFact = {
	id: 'radar',
	text: 'The radar on the map shows the last 3 hours and updates every 6 minutes.'
};

/**
 * Every ticker slot in order, worked out from current data. A slot is null when its fact
 * can't be stated yet, so the ticker skips it instead of showing a blank.
 */
export function factSlots(inputs: FactInputs): (TickerFact | null)[] {
	return [
		largestFact(inputs),
		smallestFact(inputs),
		driveFact(inputs),
		landmarkFact(inputs),
		growthFact(inputs),
		areaFact(inputs),
		cycleFact(inputs),
		reachFact(inputs),
		warmestAndColdest(inputs),
		compassFact(inputs, 'north'),
		walkFact(inputs),
		alerts(inputs),
		densestFact(inputs),
		landmarkFact(inputs),
		farthestFact(inputs),
		daylightFact(inputs),
		compassFact(inputs, 'south'),
		sparsestFact(inputs),
		driveFact(inputs),
		windiest(inputs),
		landmarkFact(inputs),
		torontoFact(inputs),
		compassFact(inputs, 'west'),
		declineFact(inputs),
		cycleFact(inputs),
		landmarkFact(inputs),
		closestFact(inputs),
		compassFact(inputs, 'east'),
		smallestAreaFact(inputs),
		walkFact(inputs),
		landmarkFact(inputs),
		longestNameFact(inputs),
		growingFact(inputs),
		busiestDistrictFact(inputs),
		sizeGapFact(inputs),
		RADAR_FACT,
		...inputs.customMessages.map((text, index) =>
			text.trim() ? { id: `custom-${index}`, text: text.trim() } : null
		)
	];
}

/** The next slot after `cursor` that has a fact, wrapping round, or -1 when none has. */
export function nextSlot(slots: (TickerFact | null)[], cursor: number): number {
	for (let step = 1; step <= slots.length; step++) {
		const index = (cursor + step) % slots.length;
		if (slots[index]) return index;
	}
	return -1;
}

/** A random slot that has a fact to start the ticker on, so the display doesn't always open the same way. */
export function startSlot(slots: (TickerFact | null)[], random: () => number): number {
	return nextSlot(slots, Math.floor(random() * slots.length) - 1);
}
