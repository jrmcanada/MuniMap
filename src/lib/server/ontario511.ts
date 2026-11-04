import type { RoadConditionRecord } from '#lib/roads/roadConditions.js';
import type { RoadEventRecord } from '#lib/roads/events.js';

const BASE_URL = 'https://511on.ca/api';
const ROAD_CONDITIONS_PATH = 'v3/get/roadconditions';
const ROAD_EVENTS_PATH = 'v2/get/event';

/** Thrown with the HTTP status the route should answer with. */
export class FeedError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

/** Asks Ontario 511 for one feed. The key stays here, on the server, and never reaches the browser. */
async function loadFeed(path: string, key: string | undefined, fetcher: typeof fetch) {
	if (!key) throw new FeedError('The Ontario 511 key is not set.', 503);
	const url = `${BASE_URL}/${path}?key=${encodeURIComponent(key)}&format=json`;
	const response = await fetcher(url).catch(() => null);
	if (!response?.ok) throw new FeedError('Ontario 511 did not answer.', 502);
	const body: unknown = await response.json().catch(() => null);
	if (!Array.isArray(body)) throw new FeedError('Ontario 511 sent something unexpected.', 502);
	return body as Record<string, unknown>[];
}

/** The feeds are large (about 1.5 MB together); the map needs only these fields. */
export async function loadRoadConditions(
	key: string | undefined,
	fetcher: typeof fetch = fetch
): Promise<RoadConditionRecord[]> {
	const records = await loadFeed(ROAD_CONDITIONS_PATH, key, fetcher);
	return records.map((record) => ({
		RoadwayName: record.RoadwayName,
		LocationDescription: record.LocationDescription,
		Condition: record.Condition,
		EncodedPolyline: record.EncodedPolyline
	})) as RoadConditionRecord[];
}

export async function loadRoadEvents(
	key: string | undefined,
	fetcher: typeof fetch = fetch
): Promise<RoadEventRecord[]> {
	const records = await loadFeed(ROAD_EVENTS_PATH, key, fetcher);
	return records.map((record) => ({
		ID: record.ID,
		RoadwayName: record.RoadwayName,
		Description: record.Description,
		EventType: record.EventType,
		IsFullClosure: record.IsFullClosure,
		Latitude: record.Latitude,
		Longitude: record.Longitude,
		DirectionOfTravel: record.DirectionOfTravel,
		LanesAffected: record.LanesAffected,
		LastUpdated: record.LastUpdated,
		PlannedEndDate: record.PlannedEndDate
	})) as RoadEventRecord[];
}
