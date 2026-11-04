import { totalCensus } from '#lib/data/facts.js';
import { sunTimes } from '#lib/weather/sun.js';
import { localDate, timeZoneAt } from '#lib/weather/timeZone.js';
import type { FactInputs, TickerFact } from './facts.js';
import { distanceKm } from './moreFacts.js';
import { TIME_ZONE, TORONTO_KM2, decimal, formatTravelTime, listNames, number } from './text.js';

/** Land area of Prince Edward Island in km². Sources quote 5,660 and 5,686, so it is only used as "about". */
const PEI_KM2 = 5_660;
/** Municipalities with no road to them, where a road trip would only reach the nearest road. */
const NO_ROAD_ACCESS = new Set(['Cockburn Island']);

// --- Roads and time zones ----------------------------------------------------------------------

/** The municipality whose road trip from the office is the longest compared with a straight line. */
export function windingFact(inputs: FactInputs): TickerFact | null {
	const trips = inputs.municipalities.flatMap((place) => {
		const trip = inputs.trips[place.name];
		if (!trip || NO_ROAD_ACCESS.has(place.name)) return [];
		const line = distanceKm(inputs.office, place);
		return [{ name: place.name, road: trip.driveKm, line, ratio: trip.driveKm / line }];
	});
	const [top] = trips.sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name));
	if (!top) return null;
	return {
		id: 'winding',
		text: `${top.name} is the most winding trip from ${inputs.office.city}: ${number.format(Math.round(top.road))} km by road, ${decimal.format(top.ratio)} times the ${number.format(Math.round(top.line))} km straight line.`
	};
}

export function timeZoneFact(inputs: FactInputs): TickerFact | null {
	const central = inputs.municipalities
		.filter(({ longitude }) => timeZoneAt(longitude) !== TIME_ZONE)
		.map(({ name }) => name)
		.sort();
	if (central.length === 0) return null;
	return {
		id: 'time-zone',
		text: `${listNames(central)} ${central.length === 1 ? 'keeps' : 'keep'} Central time, an hour behind ${inputs.office.city}.`
	};
}

/** How much earlier the sun sets in the east than in the west of our area, today. */
export function sunsetGapFact(inputs: FactInputs): TickerFact | null {
	const today = localDate(new Date(inputs.now), TIME_ZONE);
	const sorted = [...inputs.municipalities].sort(
		(a, b) => a.longitude - b.longitude || a.name.localeCompare(b.name)
	);
	const [west, east] = [sorted[0], sorted[sorted.length - 1]];
	if (!west || !east) return null;
	const setAt = (place: typeof west) =>
		sunTimes(place.latitude, place.longitude, today.year, today.month, today.day)?.sunset;
	const [westSet, eastSet] = [setAt(west), setAt(east)];
	if (!westSet || !eastSet) return null;
	const minutes = Math.round((westSet.getTime() - eastSet.getTime()) / 60_000);
	if (minutes <= 0) return null;
	return {
		id: 'sunset-gap',
		text: `The sun sets ${formatTravelTime(minutes)} earlier in ${east.name} than in ${west.name} today.`
	};
}

// --- Districts ---------------------------------------------------------------------------------

function districtTotals(inputs: FactInputs) {
	const byDistrict = new Map<string, ReturnType<typeof totalCensus>[]>();
	const entries = new Map<string, (typeof inputs.facts)[string][]>();
	for (const { name } of inputs.municipalities) {
		const facts = inputs.facts[name];
		entries.set(facts.district, [...(entries.get(facts.district) ?? []), facts]);
	}
	for (const [district, list] of entries) byDistrict.set(district, [totalCensus(list)]);
	return [...byDistrict].map(([district, [total]]) => ({ district, ...total }));
}

type DistrictKey = 'population' | 'landAreaKm2' | 'populationChangePercent';

function topDistrict(inputs: FactInputs, key: DistrictKey) {
	const [top] = districtTotals(inputs).sort(
		(a, b) => b[key] - a[key] || a.district.localeCompare(b.district)
	);
	return top;
}

export function districtPopulationFact(inputs: FactInputs): TickerFact | null {
	const top = topDistrict(inputs, 'population');
	if (!top) return null;
	return {
		id: 'district-population',
		text: `${top.district} has the most people of any district or county we serve: ${number.format(top.population)}.`
	};
}

export function districtAreaFact(inputs: FactInputs): TickerFact | null {
	const top = topDistrict(inputs, 'landAreaKm2');
	if (!top) return null;
	return {
		id: 'district-area',
		text: `${top.district} covers the most land of any district or county we serve: ${number.format(Math.round(top.landAreaKm2))} km².`
	};
}

export function districtGrowthFact(inputs: FactInputs): TickerFact | null {
	const top = topDistrict(inputs, 'populationChangePercent');
	if (!top || top.populationChangePercent <= 0) return null;
	return {
		id: 'district-growth',
		text: `${top.district} grew fastest of our districts and counties between the 2016 and 2021 censuses, up ${decimal.format(top.populationChangePercent)}%.`
	};
}

// --- Names -------------------------------------------------------------------------------------

export function andNamesFact(inputs: FactInputs): TickerFact | null {
	const names = inputs.municipalities.map(({ name }) => name).filter((name) => / and /.test(name));
	if (names.length === 0) return null;
	return {
		id: 'names-and',
		text: `${names.length} of our ${inputs.municipalities.length} municipalities have "and" in their name, such as ${[...names].sort()[0]}.`
	};
}

export function shortestNameFact(inputs: FactInputs): TickerFact | null {
	const [shortest] = [...inputs.municipalities].sort(
		(a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name)
	);
	if (!shortest) return null;
	return {
		id: 'shortest-name',
		text: `${shortest.name} has the shortest name of our municipalities, at ${shortest.name.length} letters.`
	};
}

export function commonLetterFact(inputs: FactInputs): TickerFact | null {
	const counts = new Map<string, number>();
	for (const { name } of inputs.municipalities) {
		const letter = name.charAt(0).toUpperCase();
		counts.set(letter, (counts.get(letter) ?? 0) + 1);
	}
	const [top] = [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
	if (!top) return null;
	return {
		id: 'common-letter',
		text: `${top[1]} of our ${inputs.municipalities.length} municipalities start with the letter ${top[0]}, more than any other.`
	};
}

// --- Size comparisons ---------------------------------------------------------------------------

export function peiFact(inputs: FactInputs): TickerFact | null {
	const total = inputs.municipalities.reduce(
		(sum, { name }) => sum + inputs.facts[name].landAreaKm2,
		0
	);
	if (total <= 0) return null;
	return {
		id: 'size-pei',
		text: `Together our municipalities are about ${decimal.format(total / PEI_KM2)} times the size of Prince Edward Island.`
	};
}

export function largestVsTorontoFact(inputs: FactInputs): TickerFact | null {
	const [largest] = [...inputs.municipalities].sort(
		(a, b) =>
			inputs.facts[b.name].landAreaKm2 - inputs.facts[a.name].landAreaKm2 ||
			a.name.localeCompare(b.name)
	);
	if (!largest) return null;
	return {
		id: 'largest-vs-toronto',
		text: `${largest.name} alone is about ${decimal.format(inputs.facts[largest.name].landAreaKm2 / TORONTO_KM2)} times the size of the City of Toronto.`
	};
}
