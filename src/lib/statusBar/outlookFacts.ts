import { classifyCondition } from '#lib/weather/conditionMix.js';
import { formatDegrees } from '#lib/weather/format.js';
import type { SiteWeather } from '#lib/weather/types.js';
import type { FactInputs, TickerFact } from './facts.js';
import {
	MAX_LIVE_AGE_MS,
	MAX_OBSERVATION_AGE_MS,
	MIN_TEMPERATURE_SITES,
	liveSites
} from './live.js';

// --- Rain or snow in the forecast ------------------------------------------------------------------

/**
 * How many weather stations have rain or snow in the first forecast period. Stations can start on
 * different periods, so only those on the most common one are compared.
 */
export function forecastPrecipFact(inputs: FactInputs, kind: 'rain' | 'snow'): TickerFact | null {
	const firsts = liveSites(inputs).flatMap(({ weather }) => {
		const first = weather?.forecast[0];
		return first?.summary ? [{ name: first.name, kind: classifyCondition(first.summary) }] : [];
	});
	const byName = new Map<string, number>();
	for (const { name } of firsts) byName.set(name, (byName.get(name) ?? 0) + 1);
	const [common] = [...byName].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))[0] ?? [];
	const sameDay = firsts.filter(({ name }) => name === common);
	if (sameDay.length < MIN_TEMPERATURE_SITES) return null;

	const count = sameDay.filter((item) => item.kind === kind).length;
	if (count === 0) return null;
	return {
		id: `forecast-${kind}`,
		text: `${kind === 'rain' ? 'Rain' : 'Snow'} is in the forecast (${common}) for ${count} of ${sameDay.length} weather stations.`
	};
}

// --- Warmest and coldest district --------------------------------------------------------------------

/** Each municipality takes the temperature of the station that serves it; districts are averaged. */
export function districtTemperatureFact(inputs: FactInputs): TickerFact | null {
	const temperatures = new Map<string, number>();
	for (const { siteId, weather } of liveSites(inputs)) {
		const current = weather?.current;
		const observed = current ? Date.parse(current.observedAt) : NaN;
		if (current && inputs.now - observed <= MAX_OBSERVATION_AGE_MS) {
			temperatures.set(siteId, current.temperatureC);
		}
	}
	if (temperatures.size < MIN_TEMPERATURE_SITES) return null;

	const sums = new Map<string, { total: number; count: number }>();
	for (const { name } of inputs.municipalities) {
		const { district, siteId } = inputs.facts[name];
		const celsius = temperatures.get(siteId);
		if (celsius === undefined) continue;
		const entry = sums.get(district) ?? { total: 0, count: 0 };
		entry.total += celsius;
		entry.count++;
		sums.set(district, entry);
	}
	const averages = [...sums]
		.map(([district, { total, count }]) => ({ district, average: total / count }))
		.sort((a, b) => a.average - b.average || a.district.localeCompare(b.district));
	if (averages.length < 2) return null;

	const coldest = averages[0];
	const warmest = averages[averages.length - 1];
	if (formatDegrees(warmest.average) === formatDegrees(coldest.average)) return null;
	return {
		id: 'district-temperatures',
		text: `Warmest district right now: ${warmest.district}, averaging ${formatDegrees(warmest.average)}. Coldest: ${coldest.district}, averaging ${formatDegrees(coldest.average)}.`
	};
}

// --- The Sudbury office --------------------------------------------------------------------------------

/** Weather for the office's own station, if it was fetched within the hour. */
function officeWeather(inputs: FactInputs): SiteWeather | null {
	const weather = inputs.peekWeather(inputs.officeSiteId);
	return weather && inputs.now - weather.fetchedAt <= MAX_LIVE_AGE_MS ? weather : null;
}

export function officeWeatherFact(inputs: FactInputs): TickerFact | null {
	const current = officeWeather(inputs)?.current;
	if (!current || inputs.now - Date.parse(current.observedAt) > MAX_OBSERVATION_AGE_MS) return null;
	const condition = current.condition ? `, ${current.condition.toLowerCase()}` : '';
	return {
		id: 'office-weather',
		text: `Right now at our ${inputs.office.city} office: ${formatDegrees(current.temperatureC)}${condition}.`
	};
}

export function officeForecastFact(inputs: FactInputs): TickerFact | null {
	const first = officeWeather(inputs)?.forecast[0];
	if (!first?.summary) return null;
	const temperature =
		typeof first.temperatureC === 'number'
			? `, ${first.temperatureKind ?? 'temperature'} ${formatDegrees(first.temperatureC)}`
			: '';
	return {
		id: 'office-forecast',
		text: `${first.name} in ${inputs.office.city}: ${first.summary.toLowerCase()}${temperature}.`
	};
}
