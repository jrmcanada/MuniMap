import type { MunicipalityFacts } from '#lib/data/facts.js';
import type { Municipality } from '#lib/data/municipalities.js';
import { formatDegrees } from '#lib/weather/format.js';
import type { SiteWeather } from '#lib/weather/types.js';

export interface TickerFact {
	id: string;
	text: string;
}

export interface FactInputs {
	municipalities: Municipality[];
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

const number = new Intl.NumberFormat('en-CA');
const decimal = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 });

type NumericKey = 'population' | 'populationChangePercent' | 'landAreaKm2';

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

/** Forecast sites in use, each with the weather held for it, fresh enough for "right now". */
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
	const warmest = readings[readings.length - 1];
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
		growthFact(inputs),
		areaFact(inputs),
		reachFact(inputs),
		warmestAndColdest(inputs),
		alerts(inputs),
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
