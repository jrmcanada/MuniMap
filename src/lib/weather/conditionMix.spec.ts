import { describe, it, expect } from 'vitest';
import { classifyCondition, conditionMix } from './conditionMix.js';
import type { SiteWeather } from './types.js';

const NOW = Date.parse('2026-11-04T15:00:00Z');

describe('classifyCondition', () => {
	it.each([
		['Light Rain', 'rain'],
		['Rain', 'rain'],
		['Light Freezing Drizzle', 'rain'],
		['Light Rain and Fog', 'rain'],
		['Light Snow', 'snow'],
		['Drifting Snow', 'snow'],
		['Light Snow and Drifting Snow', 'snow'],
		['Rain and Snow', 'snow'],
		['Clear', 'clear'],
		['Mainly Clear', 'clear'],
		['Sunny', 'clear'],
		['Mainly Sunny', 'clear'],
		['Mostly Sunny', 'clear'],
		['A few clouds', 'clear'],
		['A mix of sun and cloud', 'clear'],
		['Mostly Cloudy', 'cloud'],
		['Partly Cloudy', 'cloud'],
		['Mist', 'fog'],
		['Fog', 'fog'],
		['Freezing Fog', 'fog'],
		['Haze', 'fog'],
		['Overcast', 'cloud']
	])('puts "%s" under %s', (text, kind) => {
		expect(classifyCondition(text)).toBe(kind);
	});
});

describe('conditionMix', () => {
	const weather = (
		condition: string | undefined,
		extra: Partial<SiteWeather> = {}
	): SiteWeather => ({
		current: { observedAt: '2026-11-04T14:50:00Z', temperatureC: 4, condition },
		forecast: [],
		warnings: [],
		fetchedAt: NOW - 5 * 60_000,
		...extra
	});
	const places = ['A', 'B', 'C', 'D'].map((name) => ({ name }));
	// A and B share one site, as neighbouring municipalities do.
	const facts = {
		A: { siteId: 's1' },
		B: { siteId: 's1' },
		C: { siteId: 's2' },
		D: { siteId: 's3' }
	};
	const mix = (sites: Record<string, SiteWeather | null>) =>
		conditionMix({
			municipalities: places,
			facts,
			peekWeather: (id) => sites[id] ?? null,
			now: NOW
		});

	it('counts each municipality once, so a shared site counts for all of them', () => {
		const result = mix({
			s1: weather('Light Rain'),
			s2: weather('Clear'),
			s3: weather('Light Snow')
		});
		expect(result.counts).toEqual({ rain: 2, snow: 1, clear: 1, cloud: 0, fog: 0 });
		expect(result.reporting).toBe(4);
	});

	it('leaves out sites with no weather, or not fetched within the hour', () => {
		const result = mix({
			s2: weather('Clear', { fetchedAt: NOW - 61 * 60_000 }),
			s3: weather('Fog')
		});
		expect(result.counts).toEqual({ rain: 0, snow: 0, clear: 0, cloud: 0, fog: 1 });
		expect(result.reporting).toBe(1);
		expect(mix({}).reporting).toBe(0);
	});

	it('uses the first forecast period when the station gives no condition', () => {
		const forecast = (summary: string) => [{ name: 'Today', summary }];
		const result = mix({
			s1: weather(undefined, { forecast: forecast('Showers. Wind southwest 20 km/h.') }),
			s2: weather(undefined, {
				forecast: forecast('Cloudy. 40 percent chance of showers near noon. Showers beginning.')
			}),
			s3: weather(undefined, { forecast: forecast('Cloudy with 70 percent chance of showers.') })
		});
		// A and B share s1. A chance of showers is not weather that is happening, so it stays cloud.
		expect(result.counts).toEqual({ rain: 2, snow: 0, clear: 0, cloud: 2, fog: 0 });
		expect(result.reporting).toBe(4);
		expect(mix({ s1: weather(undefined) }).reporting).toBe(0);
	});

	it('prefers a fresh reading to the forecast', () => {
		const result = mix({
			s3: weather('Clear', { forecast: [{ name: 'Today', summary: 'Showers.' }] })
		});
		expect(result.counts.clear).toBe(1);
	});

	it('uses the forecast for a reading over two hours old, and keeps one from the last hour or so', () => {
		const old = weather('Clear');
		old.current!.observedAt = '2026-11-04T12:30:00Z';
		expect(mix({ s1: old }).reporting).toBe(0);
		old.forecast = [{ name: 'Today', summary: 'Rain.' }];
		expect(mix({ s1: old }).counts.rain).toBe(2);

		// Stations report hourly and the reading arrives late, so one 75 minutes old is still current.
		const recent = weather('Clear');
		recent.current!.observedAt = '2026-11-04T13:45:00Z';
		// Towns A and B share this site, so it counts for both.
		expect(mix({ s1: recent }).reporting).toBe(2);
	});
});
