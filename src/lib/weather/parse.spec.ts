import { describe, it, expect } from 'vitest';
import { parseSiteWeather } from './parse.js';

const NOW = Date.parse('2026-10-23T03:00:00Z');
const en = (value: unknown) => ({ en: value, fr: value });

const feature = {
	properties: {
		currentConditions: {
			timestamp: en('2026-10-23T03:00:00Z'),
			temperature: { value: en(2.1) },
			windChill: { value: en(-4) },
			condition: en('Mainly Clear'),
			iconCode: { url: 'https://weather.gc.ca/weathericons/31.gif' },
			wind: { speed: { value: en(11) }, direction: { value: en('WNW') }, gust: { value: en(30) } },
			relativeHumidity: { value: en(55) }
		},
		forecastGroup: {
			forecasts: [
				{
					period: { textForecastName: en('Tonight') },
					temperatures: { temperature: [{ class: en('low'), value: en(3) }] },
					abbreviatedForecast: { textSummary: en('Clear') }
				},
				{ period: { textForecastName: en('Friday') } },
				{ period: { textForecastName: en('Friday night') } },
				{ period: { textForecastName: en('Saturday') } }
			]
		},
		warnings: [
			{
				description: en('YELLOW WATCH - WINTER STORM'),
				alertColourLevel: en('yellow'),
				expiryTime: en('2026-10-23T12:00:00Z')
			},
			{
				description: en('RED WARNING - BLIZZARD'),
				alertColourLevel: en('red'),
				expiryTime: en('2026-10-23T12:00:00Z')
			},
			{
				description: en('ORANGE WARNING - OLD'),
				alertColourLevel: en('orange'),
				expiryTime: en('2026-10-22T12:00:00Z')
			}
		]
	}
};

const observed = (extra: object = {}) => ({
	properties: {
		currentConditions: {
			timestamp: en('2026-10-23T03:00:00Z'),
			temperature: { value: en(5) },
			...extra
		}
	}
});

describe('parseSiteWeather', () => {
	it('reads current conditions', () => {
		const { current } = parseSiteWeather(feature, NOW);
		expect(current).toMatchObject({
			temperatureC: 2.1,
			feelsLikeC: -4,
			condition: 'Mainly Clear',
			windSpeedKmh: 11,
			windDirection: 'WNW',
			windGustKmh: 30,
			humidityPercent: 55
		});
	});

	it('keeps the first 3 forecast periods', () => {
		const { forecast } = parseSiteWeather(feature, NOW);
		expect(forecast.map((period) => period.name)).toEqual(['Tonight', 'Friday', 'Friday night']);
		expect(forecast[0]).toMatchObject({
			temperatureC: 3,
			temperatureKind: 'low',
			summary: 'Clear'
		});
	});

	it('lists active warnings, most severe first, and drops expired ones', () => {
		const { warnings } = parseSiteWeather(feature, NOW);
		expect(warnings.map((warning) => warning.level)).toEqual(['red', 'yellow']);
	});

	it('has no current conditions when the site reports no temperature', () => {
		const bare = { properties: { currentConditions: { timestamp: en('2026-10-23T03:00:00Z') } } };
		expect(parseSiteWeather(bare, NOW).current).toBeNull();
	});

	it('leaves out fields the feed omits and copes with a missing feature', () => {
		expect(parseSiteWeather(observed(), NOW).current).toEqual(
			expect.objectContaining({
				temperatureC: 5,
				humidityPercent: undefined,
				windGustKmh: undefined
			})
		);
		expect(parseSiteWeather(null, NOW)).toMatchObject({
			current: null,
			forecast: [],
			warnings: []
		});
	});

	it('keeps the word calm for wind speed', () => {
		const calm = observed({ wind: { speed: { value: en('calm') } } });
		expect(parseSiteWeather(calm, NOW).current?.windSpeedKmh).toBe('calm');
	});
});
