import { error, json } from '@sveltejs/kit';
import { FeedError } from './ontario511.js';

/** Answers a route with a feed's records, cached for a minute, or with the feed's error status. */
export async function feedResponse(load: () => Promise<unknown>): Promise<Response> {
	try {
		return json(await load(), { headers: { 'cache-control': 'public, max-age=60' } });
	} catch (cause) {
		if (cause instanceof FeedError) error(cause.status, cause.message);
		throw cause;
	}
}
