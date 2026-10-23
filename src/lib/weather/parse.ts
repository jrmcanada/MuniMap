import type {
	CurrentConditions,
	ForecastPeriod,
	SiteWeather,
	WarningLevel,
	WeatherWarning
} from './types.js';

const FORECAST_PERIODS = 3;
const WARNING_ORDER: WarningLevel[] = ['red', 'orange', 'yellow', 'other'];

/** Reads a nested value from the feed, which can be missing at any step. */
function dig(root: unknown, ...path: string[]): unknown {
	let node = root;
	for (const key of path) {
		if (typeof node !== 'object' || node === null) return undefined;
		node = (node as Record<string, unknown>)[key];
	}
	return node;
}

function readText(root: unknown, ...path: string[]): string | undefined {
	const value = dig(root, ...path);
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function readNumber(root: unknown, ...path: string[]): number | undefined {
	const value = dig(root, ...path);
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseCurrent(properties: unknown): CurrentConditions | null {
	const current = dig(properties, 'currentConditions');
	const temperatureC = readNumber(current, 'temperature', 'value', 'en');
	const observedAt = readText(current, 'timestamp', 'en');
	if (temperatureC === undefined || !observedAt) return null;

	const speed = dig(current, 'wind', 'speed', 'value', 'en');
	return {
		observedAt,
		temperatureC,
		feelsLikeC:
			readNumber(current, 'windChill', 'value', 'en') ??
			readNumber(current, 'humidex', 'value', 'en'),
		condition: readText(current, 'condition', 'en'),
		iconUrl: readText(current, 'iconCode', 'url'),
		windSpeedKmh: speed === 'calm' ? 'calm' : typeof speed === 'number' ? speed : undefined,
		windDirection: readText(current, 'wind', 'direction', 'value', 'en'),
		windGustKmh: readNumber(current, 'wind', 'gust', 'value', 'en'),
		humidityPercent: readNumber(current, 'relativeHumidity', 'value', 'en')
	};
}

function parseForecast(properties: unknown): ForecastPeriod[] {
	const forecasts = dig(properties, 'forecastGroup', 'forecasts');
	if (!Array.isArray(forecasts)) return [];
	return forecasts.slice(0, FORECAST_PERIODS).flatMap((period) => {
		const name = readText(period, 'period', 'textForecastName', 'en');
		if (!name) return [];
		const kind = readText(period, 'temperatures', 'temperature', '0', 'class', 'en');
		return [
			{
				name,
				temperatureC: readNumber(period, 'temperatures', 'temperature', '0', 'value', 'en'),
				temperatureKind: kind === 'high' || kind === 'low' ? kind : undefined,
				summary: readText(period, 'abbreviatedForecast', 'textSummary', 'en')
			}
		];
	});
}

function parseWarnings(properties: unknown, now: number): WeatherWarning[] {
	const warnings = dig(properties, 'warnings');
	if (!Array.isArray(warnings)) return [];
	const active = warnings.flatMap((warning): WeatherWarning[] => {
		const description = readText(warning, 'description', 'en');
		if (!description) return [];
		const parsed = Date.parse(readText(warning, 'expiryTime', 'en') ?? '');
		const expiresAt = Number.isFinite(parsed) ? parsed : undefined;
		if (expiresAt !== undefined && expiresAt <= now) return [];
		const colour = readText(warning, 'alertColourLevel', 'en');
		const level = WARNING_ORDER.find((candidate) => candidate === colour) ?? 'other';
		return [{ description, level, expiresAt }];
	});
	return active.sort((a, b) => WARNING_ORDER.indexOf(a.level) - WARNING_ORDER.indexOf(b.level));
}

/** Turns one `citypageweather-realtime` feature into the fields the panel uses. */
export function parseSiteWeather(feature: unknown, now: number): SiteWeather {
	const properties = dig(feature, 'properties');
	return {
		current: parseCurrent(properties),
		forecast: parseForecast(properties),
		warnings: parseWarnings(properties, now),
		fetchedAt: now
	};
}
