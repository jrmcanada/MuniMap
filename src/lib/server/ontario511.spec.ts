import { describe, it, expect, vi } from 'vitest';
import { FeedError, loadRoadConditions, loadRoadEvents } from './ontario511.js';

const answer = (body: unknown, ok = true) =>
	vi.fn(async () => ({ ok, json: async () => body }) as Response);

describe('Ontario 511 feeds', () => {
	it('asks with the key and keeps only the fields the map uses', async () => {
		const fetcher = answer([
			{
				Condition: ['Bare and wet road'],
				EncodedPolyline: ['abc'],
				Region: 'x',
				Visibility: 'Good'
			}
		]);
		const records = await loadRoadConditions('secret', fetcher);
		expect(records).toEqual([{ Condition: ['Bare and wet road'], EncodedPolyline: ['abc'] }]);
		expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('key=secret'));
	});

	it('keeps the event fields the card shows and drops the rest', async () => {
		const [event] = await loadRoadEvents(
			'k',
			answer([{ ID: 1, Comment: 'long text', Latitude: 43 }])
		);
		expect(event).toMatchObject({ ID: 1, Latitude: 43 });
		expect(event).not.toHaveProperty('Comment');
	});

	it('fails with 503 when there is no key, without calling 511', async () => {
		const fetcher = answer([]);
		await expect(loadRoadEvents(undefined, fetcher)).rejects.toMatchObject({ status: 503 });
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('fails with 502 when 511 errors, is unreachable, or sends the wrong shape', async () => {
		const down = vi.fn(async () => Promise.reject(new Error('offline')));
		for (const fetcher of [answer([], false), down, answer({ not: 'a list' })]) {
			const failure = await loadRoadConditions('k', fetcher as unknown as typeof fetch).catch(
				(cause: unknown) => cause
			);
			expect(failure).toBeInstanceOf(FeedError);
			expect(failure).toMatchObject({ status: 502 });
		}
	});
});
