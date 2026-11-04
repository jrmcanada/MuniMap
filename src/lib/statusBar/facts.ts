import type { MunicipalityFacts } from '#lib/data/facts.js';
import type { Landmark } from '#lib/data/landmarks.js';
import type { Municipality } from '#lib/data/municipalities.js';
import type { RadarCoverage } from '#lib/radar/coverage.js';
import type { RoadEventSnapshot } from '#lib/roads/events.js';
import type { RoadSegmentSnapshot } from '#lib/roads/roadConditions.js';
import type { ConditionMix } from '#lib/weather/conditionMix.js';
import { formatDegrees } from '#lib/weather/format.js';
import { sunTimes } from '#lib/weather/sun.js';
import { localDate } from '#lib/weather/timeZone.js';
import type { SiteWeather, WarningLevel } from '#lib/weather/types.js';
import { MAX_LIVE_AGE_MS, MAX_ROAD_AGE_MS, MIN_TEMPERATURE_SITES, liveSites } from './live.js';
import {
	allTripsFact,
	forecastFact,
	mixFact,
	radarDistrictFact,
	radarMunicipalitiesFact,
	moonPhaseFact,
	nextMoonFact,
	roadHazardFact,
	roadWetFact,
	solsticeFact,
	spanFact,
	sunTimesFact
} from './moreFacts.js';
import { TIME_ZONE, decimal, formatTravelTime, number, plural } from './text.js';

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
	/** Latest road events from Ontario 511, or null before the first load. */
	roadEvents: RoadEventSnapshot | null;
	/** Latest road conditions from Ontario 511, or null before the first load. */
	roadSections: RoadSegmentSnapshot | null;
	/** What the weather is across the municipalities, or null before any site has loaded. */
	weatherMix: ConditionMix | null;
	/** Where the radar shows precipitation, or null before the first frame. */
	radar: RadarCoverage | null;
	customMessages: string[];
	/** Epoch milliseconds. */
	now: number;
}

const WALKING_KMH = 5;
const CYCLING_KMH = 20;
/** Driving time is worked out at this steady speed, not taken from the routing service. */
const DRIVING_KMH = 90;

const travelMinutes = (km: number, kmh: number) => (km / kmh) * 60;
/** Land area of the City of Toronto, 2021 census, for scale. */
const TORONTO_KM2 = 631;

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

/**
 * Closures other than roadwork, province wide: 511 covers all of Ontario, not only our
 * municipalities, and the text says so. Roadwork that shuts a ramp is left out, since the feed
 * lists dozens and they would drown out everything else.
 */
function roadClosures(inputs: FactInputs): TickerFact | null {
	const snapshot = inputs.roadEvents;
	if (!snapshot || inputs.now - snapshot.loadedAt > MAX_ROAD_AGE_MS) return null;
	const count = snapshot.events.filter(({ kind }) => kind === 'closure').length;
	return {
		id: 'road-closures',
		text:
			count === 0
				? 'Ontario 511 reports no road closures in Ontario right now, apart from roadwork.'
				: `Ontario 511 reports ${count} road ${count === 1 ? 'closure' : 'closures'} in Ontario right now, apart from roadwork.`
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

/** How many alert lines the ticker can show at once, worst first. */
const MAX_ALERT_LINES = 3;
const ALERT_RANK: Record<WarningLevel, number> = { red: 0, orange: 1, yellow: 2, other: 3 };

/**
 * Each warning or advisory in effect (plain statements are left out), worst first, with the
 * forecast sites it covers and how many of our municipalities use those sites.
 */
function activeAlerts(inputs: FactInputs) {
	const found = new Map<string, { level: WarningLevel; sites: Map<string, string> }>();
	for (const { siteId, siteName, weather } of liveSites(inputs)) {
		for (const { description, level } of weather?.warnings ?? []) {
			if (level === 'other') continue;
			const alert = found.get(description) ?? { level, sites: new Map() };
			alert.sites.set(siteId, siteName);
			found.set(description, alert);
		}
	}
	return [...found]
		.map(([description, { level, sites }]) => ({
			description,
			level,
			siteNames: [...sites.values()].sort(),
			municipalities: inputs.municipalities.filter(({ name }) =>
				sites.has(inputs.facts[name].siteId)
			).length
		}))
		.sort(
			(a, b) =>
				ALERT_RANK[a.level] - ALERT_RANK[b.level] ||
				b.municipalities - a.municipalities ||
				a.description.localeCompare(b.description)
		);
}

/** "YELLOW WARNING - RAINFALL" as "Yellow warning - rainfall". */
const sentenceCase = (text: string) => text.charAt(0) + text.slice(1).toLowerCase();

/** The nth alert in effect, named, or null when fewer are active. */
function alertDetailFact(inputs: FactInputs, index: number): TickerFact | null {
	const alert = activeAlerts(inputs)[index];
	if (!alert) return null;
	const where =
		alert.siteNames.length <= 2
			? `near ${alert.siteNames.join(' and ')}`
			: `across ${alert.siteNames.length} forecast areas`;
	return {
		id: `alert-detail-${index}`,
		text: `${sentenceCase(alert.description)} is in effect ${where}, covering ${alert.municipalities} of our municipalities.`
	};
}

/**
 * One kind of ticker line. `copies` is how many slots it gets in a lap, so a kind with several
 * copies comes up several times, and slots of one `group` are kept from following one another.
 */
interface SlotSpec {
	group: string;
	copies?: number;
	build: (inputs: FactInputs) => TickerFact | null;
}

const TRAVEL = 'travel';
const SLOT_SPECS: SlotSpec[] = [
	{ group: 'largest', build: largestFact },
	{ group: 'smallest', build: smallestFact },
	{ group: TRAVEL, copies: 4, build: driveFact },
	{ group: TRAVEL, copies: 4, build: cycleFact },
	{ group: TRAVEL, copies: 4, build: walkFact },
	{ group: 'landmark', copies: 6, build: landmarkFact },
	{ group: 'growth', build: growthFact },
	{ group: 'area', build: areaFact },
	{ group: 'reach', build: reachFact },
	{ group: 'temperatures', build: warmestAndColdest },
	{ group: 'north', build: (inputs) => compassFact(inputs, 'north') },
	{ group: 'alerts', build: alerts },
	...Array.from({ length: MAX_ALERT_LINES }, (_, index) => ({
		group: 'alert-detail',
		build: (inputs: FactInputs) => alertDetailFact(inputs, index)
	})),
	{ group: 'road-closures', build: roadClosures },
	{ group: 'densest', build: densestFact },
	{ group: 'farthest', build: farthestFact },
	{ group: 'daylight', build: daylightFact },
	{ group: 'south', build: (inputs) => compassFact(inputs, 'south') },
	{ group: 'sparsest', build: sparsestFact },
	{ group: 'wind', build: windiest },
	{ group: 'toronto', build: torontoFact },
	{ group: 'west', build: (inputs) => compassFact(inputs, 'west') },
	{ group: 'decline', build: declineFact },
	{ group: 'closest', build: closestFact },
	{ group: 'east', build: (inputs) => compassFact(inputs, 'east') },
	{ group: 'smallest-area', build: smallestAreaFact },
	{ group: 'longest-name', build: longestNameFact },
	{ group: 'growing', build: growingFact },
	{ group: 'busiest-district', build: busiestDistrictFact },
	{ group: 'size-gap', build: sizeGapFact },
	{ group: 'daylight', build: sunTimesFact },
	{ group: 'daylight', build: solsticeFact },
	{ group: 'moon', build: moonPhaseFact },
	{ group: 'moon', build: (inputs) => nextMoonFact(inputs, 'full') },
	{ group: 'moon', build: (inputs) => nextMoonFact(inputs, 'new') },
	{ group: 'all-trips', build: allTripsFact },
	{ group: 'span', build: (inputs) => spanFact(inputs, 'east-west') },
	{ group: 'span', build: (inputs) => spanFact(inputs, 'north-south') },
	{ group: 'road-sections', build: roadWetFact },
	{ group: 'road-sections', build: roadHazardFact },
	{ group: 'weather-mix', build: (inputs) => mixFact(inputs, 'rain') },
	{ group: 'weather-mix', build: (inputs) => mixFact(inputs, 'snow') },
	{ group: 'weather-mix', build: (inputs) => mixFact(inputs, 'clear') },
	{ group: 'forecast', build: (inputs) => forecastFact(inputs, 'low') },
	{ group: 'forecast', build: (inputs) => forecastFact(inputs, 'high') },
	{ group: 'radar-coverage', build: radarMunicipalitiesFact },
	{ group: 'radar-coverage', build: radarDistrictFact },
	{ group: 'radar', build: () => RADAR_FACT }
];

const CUSTOM_GROUP = 'custom';

/**
 * Every ticker slot, worked out from current data. A slot is null when its fact can't be stated
 * yet, so the ticker skips it instead of showing a blank. The order here is only a list: the
 * ticker shows the slots in a fresh random order each lap (see TickerOrder).
 */
export function factSlots(inputs: FactInputs): (TickerFact | null)[] {
	return [
		...SLOT_SPECS.flatMap(({ copies = 1, build }) =>
			Array.from({ length: copies }, () => build(inputs))
		),
		...inputs.customMessages.map((text, index) =>
			text.trim() ? { id: `custom-${index}`, text: text.trim() } : null
		)
	];
}

/** The group of each slot `factSlots` returns, in the same order. */
export function slotGroups(customMessageCount: number): string[] {
	return [
		...SLOT_SPECS.flatMap(({ group, copies = 1 }) => Array<string>(copies).fill(group)),
		...Array<string>(customMessageCount).fill(CUSTOM_GROUP)
	];
}

/**
 * Slot numbers in a random order, with no two slots of one group side by side where that can be
 * helped, and the first not in `avoidFirst` so a new lap does not repeat the last line shown.
 */
export function shuffledOrder(
	groups: string[],
	random: () => number,
	avoidFirst?: string
): number[] {
	const remaining = groups.map((_, index) => index);
	const order: number[] = [];
	let previous = avoidFirst;
	while (remaining.length > 0) {
		// A group with so many slots left that it needs every other one must go next, or the last
		// of them would end up side by side.
		const left = new Map<string, number>();
		for (const index of remaining) left.set(groups[index], (left.get(groups[index]) ?? 0) + 1);
		const [crowded, count] = [...left].sort(([, x], [, y]) => y - x)[0];
		const urgent = 2 * count - 1 >= remaining.length && crowded !== previous;

		const allowed = remaining.filter((index) =>
			urgent ? groups[index] === crowded : groups[index] !== previous
		);
		const pool = allowed.length > 0 ? allowed : remaining;
		const chosen = pool[Math.floor(random() * pool.length)];
		remaining.splice(remaining.indexOf(chosen), 1);
		order.push(chosen);
		previous = groups[chosen];
	}
	return order;
}

/**
 * Walks the slots in a fresh random order each lap, so the ticker never settles into a pattern.
 * Every slot comes up once a lap; empty slots are skipped, and a changed slot count starts a lap.
 */
export class TickerOrder {
	#order: number[] = [];
	#position = -1;
	#lastGroup: string | undefined;

	constructor(private readonly random: () => number) {}

	/** The next fact to show, or null when no slot has one. */
	next(slots: (TickerFact | null)[], groups: string[]): TickerFact | null {
		if (this.#order.length !== slots.length) this.#startLap(groups);
		for (let tried = 0; tried < slots.length; tried++) {
			this.#position++;
			if (this.#position >= this.#order.length) {
				this.#startLap(groups);
				this.#position = 0;
			}
			this.#avoidRepeat(slots, groups);
			const index = this.#order[this.#position];
			const fact = slots[index];
			if (fact) {
				this.#lastGroup = groups[index];
				return fact;
			}
		}
		return null;
	}

	/**
	 * Empty slots are skipped, which can bring two slots of one group together. If the slot up next
	 * repeats the last group shown, it swaps places with the next one in the lap that does not.
	 */
	#avoidRepeat(slots: (TickerFact | null)[], groups: string[]) {
		const here = this.#order[this.#position];
		if (!slots[here] || groups[here] !== this.#lastGroup) return;
		for (let later = this.#position + 1; later < this.#order.length; later++) {
			const candidate = this.#order[later];
			if (slots[candidate] && groups[candidate] !== this.#lastGroup) {
				this.#order[this.#position] = candidate;
				this.#order[later] = here;
				return;
			}
		}
	}

	#startLap(groups: string[]) {
		this.#order = shuffledOrder(groups, this.random, this.#lastGroup);
		this.#position = -1;
	}
}
