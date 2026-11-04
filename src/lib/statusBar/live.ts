import type { SiteWeather } from '#lib/weather/types.js';
import type { FactInputs } from './facts.js';

/** Road data older than this is not stated as fact; the feeds refresh every 5 minutes. */
export const MAX_ROAD_AGE_MS = 30 * 60 * 1000;
/** "Right now" facts ignore weather older than this. */
export const MAX_LIVE_AGE_MS = 60 * 60 * 1000;
/**
 * A station reading counts as current for this long. Stations report once an hour and the reading
 * reaches the feed 15 to 35 minutes late, so a one hour limit would drop most stations for part
 * of every hour. This matches the weather cache, which keeps a reading for two hours.
 */
export const MAX_OBSERVATION_AGE_MS = 2 * 60 * 60 * 1000;
/** Below this many sites, "warmest" and "coldest" would just be the first ones to load. */
export const MIN_TEMPERATURE_SITES = 8;

/**
 * Forecast sites in use, each with the weather held for it. The cache already drops anything
 * fetched over 2 hours ago; "right now" facts are stricter and want a fetch within the hour.
 */
export function liveSites(
	inputs: FactInputs
): { siteId: string; siteName: string; weather: SiteWeather | null }[] {
	const sites = new Map<string, string>();
	for (const { name } of inputs.municipalities) {
		const { siteId, siteName } = inputs.facts[name];
		sites.set(siteId, siteName);
	}
	return [...sites].map(([siteId, siteName]) => {
		const weather = inputs.peekWeather(siteId);
		const fresh = weather && inputs.now - weather.fetchedAt <= MAX_LIVE_AGE_MS;
		return { siteId, siteName, weather: fresh ? weather : null };
	});
}
