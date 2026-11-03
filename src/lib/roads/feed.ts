/**
 * Ontario 511 allows ten calls a minute. The app asks far less often: road conditions change over
 * hours, not seconds.
 */
export const ROAD_REFRESH_MS = 5 * 60 * 1000;

/**
 * Loads records now and then every `ROAD_REFRESH_MS`, passing `convert`ed results to `onUpdate`. A
 * failed or empty load keeps the last good result, since a stale road colour is more useful on a
 * wall display than a map that suddenly loses its roads. Returns a stop function.
 */
export function startRoadFeed<Item, Result>(
	load: () => Promise<Item[] | null>,
	convert: (records: Item[]) => Result,
	onUpdate: (result: Result) => void
): () => void {
	let stopped = false;

	async function refresh() {
		try {
			const records = await load();
			if (!stopped && records) onUpdate(convert(records));
		} catch {
			// Keep what is on the map; the next refresh tries again.
		}
	}

	void refresh();
	const timer = setInterval(() => void refresh(), ROAD_REFRESH_MS);
	return () => {
		stopped = true;
		clearInterval(timer);
	};
}
