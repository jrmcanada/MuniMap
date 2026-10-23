import { describe, it, expect, vi } from 'vitest';
import { MAX_AGE_MS, WeatherCache } from './cache.js';

const en = (value: unknown) => ({ en: value, fr: value });
const observed = (iso: string) => ({
	properties: { currentConditions: { timestamp: en(iso), temperature: { value: en(5) } } }
});

describe('WeatherCache', () => {
	it('fetches once for several callers and reuses the result for 10 minutes', async () => {
		let now = Date.parse('2026-10-23T03:00:00Z');
		const fetchSite = vi.fn().mockResolvedValue(observed('2026-10-23T03:00:00Z'));
		const cache = new WeatherCache(fetchSite, () => now);

		const [first, second] = await Promise.all([cache.load('on-138'), cache.load('on-138')]);
		expect(first).toBe(second);
		expect(fetchSite).toHaveBeenCalledOnce();

		now += 9 * 60_000;
		await cache.load('on-138');
		expect(fetchSite).toHaveBeenCalledOnce();

		now += 2 * 60_000;
		await cache.load('on-138');
		expect(fetchSite).toHaveBeenCalledTimes(2);
	});

	it('serves the last good data when a refresh fails', async () => {
		let now = Date.parse('2026-10-23T03:00:00Z');
		const fetchSite = vi
			.fn()
			.mockResolvedValueOnce(observed('2026-10-23T03:00:00Z'))
			.mockRejectedValue(new Error('down'));
		const cache = new WeatherCache(fetchSite, () => now);
		await cache.load('on-138');

		now += 20 * 60_000;
		const weather = await cache.load('on-138');
		expect(weather?.current?.temperatureC).toBe(5);
	});

	it('drops weather fetched more than 2 hours ago', async () => {
		let now = Date.parse('2026-10-23T03:00:00Z');
		const fetchSite = vi.fn().mockResolvedValue(observed('2026-10-23T03:00:00Z'));
		const cache = new WeatherCache(fetchSite, () => now);
		await cache.load('on-138');
		expect(cache.peek('on-138')).not.toBeNull();

		now += MAX_AGE_MS + 1;
		expect(cache.peek('on-138')).toBeNull();
	});

	it('keeps the forecast when the station stopped reporting hours ago', async () => {
		const now = Date.parse('2026-10-23T03:00:00Z');
		const feature = {
			properties: {
				...observed('2026-10-22T22:00:00Z').properties,
				forecastGroup: { forecasts: [{ period: { textForecastName: en('Tonight') } }] }
			}
		};
		const cache = new WeatherCache(vi.fn().mockResolvedValue(feature), () => now);
		const weather = await cache.load('on-83');
		expect(weather?.current).toBeNull();
		expect(weather?.forecast).toHaveLength(1);
	});

	it('drops a warning once it expires, even while the data is reused', async () => {
		let now = Date.parse('2026-10-23T03:00:00Z');
		const feature = {
			properties: {
				...observed('2026-10-23T03:00:00Z').properties,
				warnings: [
					{
						description: en('YELLOW WARNING - SNOWFALL'),
						alertColourLevel: en('yellow'),
						expiryTime: en('2026-10-23T03:05:00Z')
					}
				]
			}
		};
		const cache = new WeatherCache(vi.fn().mockResolvedValue(feature), () => now);
		expect((await cache.load('on-138'))?.warnings).toHaveLength(1);

		now += 6 * 60_000;
		expect(cache.peek('on-138')?.warnings).toHaveLength(0);
	});

	it('resolves to null when nothing has ever loaded', async () => {
		const cache = new WeatherCache(vi.fn().mockRejectedValue(new Error('down')));
		expect(await cache.load('on-138')).toBeNull();
	});
});
