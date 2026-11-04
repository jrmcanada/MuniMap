import { sunTimes } from '#lib/weather/sun.js';
import { localDate } from '#lib/weather/timeZone.js';
import type { FactInputs, TickerFact } from './facts.js';
import { distanceKm } from './moreFacts.js';
import { DRIVING_KMH, TIME_ZONE, TORONTO_KM2, decimal, formatTravelTime, number } from './text.js';

const CENSUS_YEARS = 'between the 2016 and 2021 censuses';
/** "Within a 2 hour drive" is measured at the same steady speed as the other driving lines. */
const DRIVE_BAND_HOURS = 2;

/** Population in 2016, worked back from the 2021 figure and the percentage change. */
const population2016 = (population: number, changePercent: number) =>
	population / (1 + changePercent / 100);

// --- How big our municipalities are --------------------------------------------------------------

const populations = (inputs: FactInputs) =>
	inputs.municipalities.map(({ name }) => ({ name, people: inputs.facts[name].population }));

export function medianPopulationFact(inputs: FactInputs): TickerFact | null {
	const sorted = populations(inputs)
		.map(({ people }) => people)
		.sort((a, b) => a - b);
	if (sorted.length === 0) return null;
	const middle = Math.floor(sorted.length / 2);
	const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
	return {
		id: 'median-population',
		text: `The median municipality we serve has ${number.format(Math.round(median))} people.`
	};
}

/** How many of the smallest municipalities it takes to still have fewer people than the largest. */
export function smallestTogetherFact(inputs: FactInputs): TickerFact | null {
	const sorted = populations(inputs).sort(
		(a, b) => a.people - b.people || a.name.localeCompare(b.name)
	);
	const largest = sorted[sorted.length - 1];
	if (!largest) return null;
	let total = 0;
	let count = 0;
	for (const { people } of sorted.slice(0, -1)) {
		if (total + people >= largest.people) break;
		total += people;
		count++;
	}
	if (count < 2) return null;
	return {
		id: 'smallest-together',
		text: `Our ${count} smallest municipalities together have fewer people than ${largest.name}.`
	};
}

export function biggerThanTorontoFact(inputs: FactInputs): TickerFact | null {
	const count = inputs.municipalities.filter(
		({ name }) => inputs.facts[name].landAreaKm2 > TORONTO_KM2
	).length;
	if (count === 0) return null;
	return {
		id: 'bigger-than-toronto',
		text:
			count === 1
				? '1 of our municipalities covers more land than the City of Toronto.'
				: `${count} of our municipalities each cover more land than the City of Toronto.`
	};
}

// --- Growth and decline in people -----------------------------------------------------------------

export function biggestGainFact(inputs: FactInputs): TickerFact | null {
	const gains = inputs.municipalities.map(({ name }) => {
		const { population, populationChangePercent } = inputs.facts[name];
		return { name, gain: population - population2016(population, populationChangePercent) };
	});
	const [top] = gains.sort((a, b) => b.gain - a.gain || a.name.localeCompare(b.name));
	if (!top || top.gain < 1) return null;
	return {
		id: 'biggest-gain',
		text: `${top.name} added about ${number.format(Math.round(top.gain))} people ${CENSUS_YEARS}.`
	};
}

export function shrankCountFact(inputs: FactInputs): TickerFact | null {
	const shrank = inputs.municipalities.filter(
		({ name }) => inputs.facts[name].populationChangePercent < 0
	).length;
	if (shrank === 0) return null;
	return {
		id: 'shrank',
		text: `${shrank} of our ${inputs.municipalities.length} municipalities shrank ${CENSUS_YEARS}.`
	};
}

export function totalChangeFact(inputs: FactInputs): TickerFact | null {
	let now = 0;
	let before = 0;
	for (const { name } of inputs.municipalities) {
		const { population, populationChangePercent } = inputs.facts[name];
		now += population;
		before += population2016(population, populationChangePercent);
	}
	const net = Math.round(now - before);
	if (net === 0) return null;
	return {
		id: 'total-change',
		text: `Together our municipalities ${net > 0 ? 'gained' : 'lost'} about ${number.format(Math.abs(net))} people ${CENSUS_YEARS}.`
	};
}

// --- Daylight, drives and distances ---------------------------------------------------------------

/** Daylight today in the northernmost and southernmost municipality. */
export function northSouthDaylightFact(inputs: FactInputs): TickerFact | null {
	const byLatitude = [...inputs.municipalities].sort(
		(a, b) => b.latitude - a.latitude || a.name.localeCompare(b.name)
	);
	const [north, south] = [byLatitude[0], byLatitude[byLatitude.length - 1]];
	if (!north || !south) return null;
	const today = localDate(new Date(inputs.now), TIME_ZONE);
	const daylight = (place: typeof north) => {
		const times = sunTimes(place.latitude, place.longitude, today.year, today.month, today.day);
		return times && (times.sunset.getTime() - times.sunrise.getTime()) / 60_000;
	};
	const [northMinutes, southMinutes] = [daylight(north), daylight(south)];
	if (northMinutes === null || southMinutes === null) return null;
	return {
		id: 'north-south-daylight',
		text: `Today ${north.name} in the north gets ${formatTravelTime(Math.round(northMinutes))} of daylight and ${south.name} in the south gets ${formatTravelTime(Math.round(southMinutes))}.`
	};
}

export function driveBandFact(inputs: FactInputs): TickerFact | null {
	const known = inputs.municipalities.filter(({ name }) => inputs.trips[name]);
	if (known.length === 0) return null;
	const limitKm = DRIVE_BAND_HOURS * DRIVING_KMH;
	const within = known.filter(({ name }) => inputs.trips[name].driveKm <= limitKm).length;
	return {
		id: 'drive-band',
		text: `${within} of our ${known.length} municipalities are within a ${DRIVE_BAND_HOURS} hour drive of ${inputs.office.city}.`
	};
}

/** The closest or farthest pair of municipalities, by straight line. Ties go to the first names. */
function pairBy(inputs: FactInputs, which: 'closest' | 'farthest') {
	const sign = which === 'closest' ? 1 : -1;
	const places = [...inputs.municipalities].sort((a, b) => a.name.localeCompare(b.name));
	let best: { a: string; b: string; km: number } | null = null;
	for (let i = 0; i < places.length; i++) {
		for (let j = i + 1; j < places.length; j++) {
			const km = distanceKm(places[i], places[j]);
			if (!best || sign * (km - best.km) < 0) best = { a: places[i].name, b: places[j].name, km };
		}
	}
	return best;
}

export function closestPairFact(inputs: FactInputs): TickerFact | null {
	const pair = pairBy(inputs, 'closest');
	if (!pair) return null;
	return {
		id: 'closest-pair',
		text: `The two closest of our municipalities are ${pair.a} and ${pair.b}, just ${decimal.format(pair.km)} km apart.`
	};
}

export function farthestPairFact(inputs: FactInputs): TickerFact | null {
	const pair = pairBy(inputs, 'farthest');
	if (!pair) return null;
	return {
		id: 'farthest-pair',
		text: `The two farthest apart are ${pair.a} and ${pair.b}, ${number.format(Math.round(pair.km))} km in a straight line.`
	};
}

/** The municipality nearest the average position of all of them. */
export function centreFact(inputs: FactInputs): TickerFact | null {
	const places = inputs.municipalities;
	if (places.length === 0) return null;
	const middle = {
		longitude: places.reduce((sum, { longitude }) => sum + longitude, 0) / places.length,
		latitude: places.reduce((sum, { latitude }) => sum + latitude, 0) / places.length
	};
	const [nearest] = [...places].sort(
		(a, b) => distanceKm(middle, a) - distanceKm(middle, b) || a.name.localeCompare(b.name)
	);
	return {
		id: 'centre',
		text: `The middle of our municipalities, by position, lies closest to ${nearest.name}.`
	};
}

/** The weather station that serves the most municipalities. */
export function busiestStationFact(inputs: FactInputs): TickerFact | null {
	const served = new Map<string, { siteName: string; count: number }>();
	for (const { name } of inputs.municipalities) {
		const { siteId, siteName } = inputs.facts[name];
		served.set(siteId, { siteName, count: (served.get(siteId)?.count ?? 0) + 1 });
	}
	const [top] = [...served.values()].sort(
		(a, b) => b.count - a.count || a.siteName.localeCompare(b.siteName)
	);
	if (!top) return null;
	return {
		id: 'busiest-station',
		text: `${top.siteName}'s weather station serves the most of our municipalities: ${top.count}.`
	};
}
