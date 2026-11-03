import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { ROAD_REFRESH_MS, startRoadFeed } from './feed.js';
import type { RoadConditionRecord } from './roadConditions.js';

const record: RoadConditionRecord = {
	RoadwayName: '17',
	LocationDescription: 'Somewhere',
	Condition: ['Bare and dry road'],
	EncodedPolyline: ['_p~iF~ps|U_ulLnnqC_mqNvxq`@'],
	LastUpdated: 1793000000
};

describe('startRoadFeed', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('loads at once and then every refresh', async () => {
		const load = vi.fn(async () => [record]);
		const onUpdate = vi.fn();
		const stop = startRoadFeed(load, onUpdate);

		await vi.advanceTimersByTimeAsync(0);
		expect(onUpdate).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(ROAD_REFRESH_MS);
		expect(onUpdate).toHaveBeenCalledTimes(2);
		expect(onUpdate.mock.calls[0][0][0].status).toBe('clear');
		stop();
	});

	it('keeps the last roads when a load fails or has nothing', async () => {
		const load = vi
			.fn<() => Promise<RoadConditionRecord[] | null>>()
			.mockResolvedValueOnce([record])
			.mockRejectedValueOnce(new Error('down'))
			.mockResolvedValueOnce(null);
		const onUpdate = vi.fn();
		const stop = startRoadFeed(load, onUpdate);

		await vi.advanceTimersByTimeAsync(2 * ROAD_REFRESH_MS);
		expect(load).toHaveBeenCalledTimes(3);
		expect(onUpdate).toHaveBeenCalledTimes(1);
		stop();
	});

	it('stops loading once stopped', async () => {
		const load = vi.fn(async () => [record]);
		const stop = startRoadFeed(load, vi.fn());
		await vi.advanceTimersByTimeAsync(0);
		stop();
		await vi.advanceTimersByTimeAsync(3 * ROAD_REFRESH_MS);
		expect(load).toHaveBeenCalledTimes(1);
	});
});
