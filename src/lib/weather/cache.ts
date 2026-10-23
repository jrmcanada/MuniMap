import { parseSiteWeather } from './parse.js';
import type { SiteWeather } from './types.js';

const REFRESH_MS = 10 * 60 * 1000;
/** Weather older than this is dropped rather than shown as if it were current. */
export const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;

export type FetchSite = (siteId: string, signal: AbortSignal) => Promise<unknown>;

const fetchSiteFromApi: FetchSite = async (siteId, signal) => {
	const url = `https://api.weather.gc.ca/collections/citypageweather-realtime/items/${siteId}?f=json&lang=en`;
	const response = await fetch(url, { signal });
	if (!response.ok) throw new Error(`Weather ${siteId} failed: ${response.status}`);
	return response.json();
};

/** How old the data is: from the observation when there is one, otherwise from the fetch. */
function ageMs(weather: SiteWeather, now: number): number {
	return now - (weather.current ? Date.parse(weather.current.observedAt) : weather.fetchedAt);
}

/**
 * Weather per forecast site, in memory only. Several municipalities can share a site, so
 * one fetch serves them all. A failed fetch leaves the last good data in place.
 */
export class WeatherCache {
	private entries = new Map<string, SiteWeather>();
	private pending = new Map<string, Promise<SiteWeather | null>>();

	constructor(
		private fetchSite: FetchSite = fetchSiteFromApi,
		private now: () => number = Date.now
	) {}

	/** What is held for the site, or null when nothing is held or it is too old. */
	peek(siteId: string): SiteWeather | null {
		const weather = this.entries.get(siteId);
		return weather && ageMs(weather, this.now()) <= MAX_AGE_MS ? weather : null;
	}

	/** Fetches unless the held copy is under 10 minutes old. Never rejects. */
	load(siteId: string): Promise<SiteWeather | null> {
		const held = this.entries.get(siteId);
		if (held && this.now() - held.fetchedAt < REFRESH_MS) return Promise.resolve(this.peek(siteId));

		const inFlight = this.pending.get(siteId);
		if (inFlight) return inFlight;

		const request = this.fetchSite(siteId, AbortSignal.timeout(TIMEOUT_MS))
			.then((feature) => this.entries.set(siteId, parseSiteWeather(feature, this.now())))
			.catch(() => {
				// Keep whatever is held; the next load tries again.
			})
			.then(() => this.peek(siteId))
			.finally(() => this.pending.delete(siteId));
		this.pending.set(siteId, request);
		return request;
	}
}
